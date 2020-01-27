const moment = require("moment");
const _ = require("lodash");
const Q = require("q");
const UILog = require("./handler/UI_handler");
const { errorModel } = require("../../../helpers");
const {
  MainState,
  MonthState,
  DayState,
  Visitors
} = require("../../../database/model/visitors");
const FetchData = require("./handler/FetchData");

const cityConverter = cityContainer =>
  _.transform(
    cityContainer,
    (result, cities, country) =>
      _.forIn(JSON.parse(cities), (count, city) =>
        result.push({ country, city, count })
      ),
    []
  );

const prepareDataToStore = async ({ fetchData, config }) => {
  let deferred = Q.defer();
  let checkCount = 5;
  let container = [];
  for (let i = 0; i < checkCount; i++) {
    let Year = +moment()
      .subtract(i, "year")
      .format("YYYY");
    let obj;
    try {
      obj = await fetchData.fetchYearData(Year);
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "fetchYearData", err));
    }

    let { countryState, cityState } = obj;
    if (!countryState || !cityState) continue;
    _.forIn(countryState, (value, key) => (countryState[key] = +value));
    cityState = cityConverter(cityState);
    const mainState = new MainState({
      Year,
      CountryState: countryState,
      CityState: cityState
    });

    //TODO: TEST
    let resObj;
    try {
      resObj =
        Year === +moment().format("YYYY")
          ? await CurrentYear({
              Year,
              month: +moment().format("MM"),
              fetchData,
              config
            })
          : await OtherYears({ Year, checkCount: 12, fetchData, config });
      // (Year === moment().format("YYYY"))
      //     ?   await Sample2(client,visitorsState,Year,moment().subtract(1,'month').format("MM"))
      //     :   await Sample(client,visitorsState,Year,12);
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "prepareDataToStore", err));
    }

    let { monthState, dayModelCollection, visitorModel } = resObj;
    monthState = new MonthState(monthState);
    monthState.DaysDetail = dayModelCollection;
    mainState.MonthsDetail = monthState;
    visitorModel.VisitorsState = monthState;
    container.push(mainState, ...dayModelCollection, monthState, visitorModel);
  }
  if (container.length === 0)
    deferred.reject(
      errorModel(
        config.logBucket,
        "prepareDataToStore",
        "[Redis] There Is An Error In Fetching YearData Data From Redis"
      )
    );
  deferred.resolve({ container, config, fetchData });
  return deferred.promise;
};

const CurrentYear = async ({ Year, month, fetchData, config }) => {
  let deferred = Q.defer();
  for (let Month = month; Month > 0; Month--) {
    let obj;
    try {
      obj = await fetchData.fetchCurrentMonthData(Year, Month);
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "CurrentYear", err));
    }
    let { monthCountryState, monthCityState } = obj;

    if (!monthCountryState || !monthCityState) continue;
    _.forIn(
      monthCountryState,
      (value, key) => (monthCountryState[key] = +value)
    );
    const monthState = {
      Year,
      Month,
      CountryState: monthCountryState,
      CityState: cityConverter(monthCityState)
    };
    let visitor;
    try {
      visitor = await Visitors.findOne({ Year, Month });
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "CurrentYear", err));
    }
    let visitorModel = visitor ? visitor : new Visitors({ Year, Month });
    let iterateCount = +moment(`${Year}/${Month}`, "YYYY/MM").daysInMonth();
    let visitorsDailyState;
    try {
      visitorsDailyState = await fetchData.fetchDaysData();
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "CurrentYear", err));
    }

    let dayModelCollection = [];
    for (let Day = 1; Day <= iterateCount; Day++) {
      let Dat = `${Year}/${Month}/${Day}`;
      let prevObj = visitorsDailyState[Dat];
      if (!prevObj) continue;
      let dayCountryState = {};
      let dayCityState = [];
      _.forIn(JSON.parse(prevObj), (value, key) => {
        key = key.split(":");
        dayCityState.push({ city: key[1], count: value });
        dayCountryState[key[0]] = dayCountryState[key[0]]
          ? dayCountryState[key[0]] + value
          : value;
      });
      let dayState = new DayState({
        Date: Dat,
        CountryState: dayCountryState,
        CityState: dayCityState
      });
      dayModelCollection.push(dayState);
    }
    deferred.resolve({ monthState, dayModelCollection, visitorModel });
  }
  return deferred.promise;
};

const OtherYears = async ({ Year, checkCount, fetchData, config }) => {
  let deferred = Q.defer();
  for (let Month = 1; Month <= checkCount; Month++) {
    let obj;
    try {
      obj = await fetchData.fetchOtherMonthsData(Year, Month);
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "OtherYears", err));
    }
    let { monthCountryState, monthCityState } = obj;
    if (!monthCountryState || !monthCityState) continue;
    _.forIn(
      monthCountryState,
      (value, key) => (monthCountryState[key] = +value)
    );
    const monthState = {
      Year,
      Month,
      CountryState: monthCountryState,
      CityState: cityConverter(monthCityState)
    };

    let visitor;
    try {
      visitor = await Visitors.findOne({ Year, Month });
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "OtherYears", err));
    }

    let visitorModel = visitor ? visitor : new Visitors({ Year, Month });

    let visitorsDailyState;
    try {
      visitorsDailyState = await fetchData.fetchDaysData();
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "OtherYears", err));
    }

    let iterateCount = moment(`${Year}/${Month}`, "YYYY/MM").daysInMonth();
    let dayModelCollection = [];
    for (let Day = 1; Day <= iterateCount; Day++) {
      let Dat = `${Year}/${Month}/${Day}`;
      let prevObj = visitorsDailyState[Dat];
      if (!prevObj) continue;
      let dayCountryState = {};
      let dayCityState = [];
      _.forIn(JSON.parse(prevObj), (value, key) => {
        key = key.split(":");
        dayCityState.push({ city: key[1], count: value });
        dayCountryState[key[0]] = dayCountryState[key[0]]
          ? dayCountryState[key[0]] + value
          : value;
      });
      let dayState = new DayState({
        Date: Dat,
        CountryState: dayCountryState,
        CityState: dayCityState
      });
      dayModelCollection.push(dayState);
    }
    deferred.resolve({ monthState, dayModelCollection, visitorModel });
  }
  return deferred.promise;
};

const deleteDataFromRedisDB = async ({ fetchData, config }) => {
  let deferred = Q.defer();
  let checkCount = 5;
  let deleteCurrentYear = async Year => {
    // Delete All Months Except Current Month
    let currentMonth = +moment().format("MM");
    for (let Month = 1; Month < currentMonth; Month++) {
      try {
        await fetchData.deleteMonthData(Year, Month);
        await fetchData.deleteDaysData(Year, Month);
      } catch (err) {
        deferred.reject(
          errorModel(config.logBucket, "deleteDataFromRedis", err)
        );
      }
    }
  };

  let deleteOtherYears = async Year => {
    // Delete other Years all Months
    for (let Month = 1; Month <= 12; Month++) {
      try {
        await fetchData.deleteMonthData(Year, Month);
        await fetchData.deleteYearData(Year, Month);
        await fetchData.deleteDaysData(Year, Month);
      } catch (err) {
        deferred.reject(
          errorModel(config.logBucket, "deleteDataFromRedis", err)
        );
      }
    }
  };

  for (let i = 0; i < checkCount; i++) {
    let Year = +moment()
      .subtract(i, "year")
      .format("YYYY");
    let obj;
    try {
      obj = await fetchData.fetchYearData(Year);
    } catch (err) {
      deferred.reject(errorModel(config.logBucket, "deleteDataFromRedis", err));
    }
    let { countryState, cityState } = obj;
    if (!countryState || !cityState) continue;
    Year === +moment().format("YYYY")
      ? deleteCurrentYear(Year)
      : deleteOtherYears(Year);
  }
  deferred.resolve();
  return deferred.promise;
};

const storeDataToMongoDB = ({ container, config, fetchData }) => {
  let deferred = Q.defer();
  Promise.all(container.map(el => el.save()))
    .then(_ => deferred.resolve({ fetchData, config }))
    .catch(err =>
      deferred.reject(errorModel(config.logBucket, "storeDataToMongoDB", err))
    );
  return deferred.promise;
};
module.exports = ({ client, config }) =>
  new UILog({ config, client }).master({
    Initial: { fetchData: new FetchData({ client }), config },
    Prepare: prepareDataToStore,
    Save: storeDataToMongoDB,
    Delete: deleteDataFromRedisDB
  });
