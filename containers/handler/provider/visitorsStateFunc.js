const moment = require("moment"),
  _ = require("lodash"),
  chalk = require("chalk"),
  MainState = require("../../../database/model/visitors/visitorsState"),
  MonthState = require("../../../database/model/visitors/monthsVisitorsState"),
  DayState = require("../../../database/model/visitors/daysDetailState"),
  Visitors = require("../../../database/model/visitors");

// Util Functions
function cityConverter(cityContainer) {
  return _.transform(
    cityContainer,
    (result, cities, country) =>
      _.forIn(JSON.parse(cities), (count, city) =>
        result.push({ country, city, count })
      ),
    []
  );
}
// fetch Data from redis
function FetchData(client, deferred) {
  this.client = client;
  this.deferred = deferred;
  this.dayStateContainer = (async function iterate(count = 0, client) {
    let DayStateContainer = await client.hscan(
      "visitors:state",
      count,
      "count",
      2000
    );
    return +DayStateContainer[0] === 0
      ? DayStateContainer[1].filter((el, index) => {
          if (index % 2 === 0) return true;
        })
      : iterate(+DayStateContainer[0]);
  })(0, this.client);
  return {
    fetchCurrentMonthData: async (Year, Month) => {
      let monthCountryState, monthCityState;
      try {
        monthCountryState = await this.client.hgetall(
          `visitors:state:country:month:${Year}:${Month}`
        );
        monthCityState = await this.client.hgetall(
          `visitors:state:city:month:${Year}:${Month}`
        );
      } catch (error) {
        console.log("Error:", error);
        this.deferred.reject(error);
      }
      return { monthCountryState, monthCityState };
    },
    fetchYearData: async Year => {
      let countryState, cityState;
      try {
        countryState = await this.client.hgetall(
          `visitors:state:country:year:${Year}`
        );
        cityState = await this.client.hgetall(
          `visitors:state:city:year:${Year}`
        );
      } catch (error) {
        // console.log('Error:[visitorStateFuc]',error.message)
        this.deferred.reject(error.message);
      }
      return { countryState, cityState };
    },
    fetchOtherMonthsData: async (Year, Month) => {
      let monthCountryState, monthCityState;
      try {
        monthCountryState = await this.client.hgetall(
          `visitors:state:country:month:${Year}:${Month}`
        );
        monthCityState = await this.client.hgetall(
          `visitors:state:city:month:${Year}:${Month}`
        );
      } catch (error) {
        console.log("Error:", error);
        this.deferred.reject(error);
      }
      return { monthCountryState, monthCityState };
    },
    fetchDaysData: async () => {
      let visitorsDailyState;
      try {
        visitorsDailyState = await this.client.hgetall("visitors:state");
      } catch (error) {
        console.log("Error:", error);
        this.deferred.reject(error);
      }
      return visitorsDailyState;
    },
    deleteMonthData: async (Year, Month) => {
      try {
        //TODO: TEST
        console.log("DELETE:::", `visitors:state:city:month:${Year}:${Month}`);
        console.log(
          "DELETE:::",
          `visitors:state:country:month:${Year}:${Month}`
        );
        // await this.client.del(`visitors:state:city:month:${Year}:${Month}`)
        // await this.client.del(`visitors:state:country:month:${Year}:${Month}`)
      } catch (err) {
        this.deferred.reject(err);
      }
    },
    deleteYearData: async Year => {
      try {
        //TODO: TEST
        console.log("DELETE:::", `visitors:state:city:year:${Year}`);
        console.log("DELETE:::", `visitors:state:country:year:${Year}`);
        // await this.client.del(`visitors:state:city:year:${Year}`)
        // await this.client.del(`visitors:state:country:year:${Year}`)
      } catch (err) {
        this.deferred.reject(err);
      }
    },
    deleteDaysData: async (Year, Month) => {
      let dayState = await this.dayStateContainer;
      let keys = dayState.filter(el => {
        let regex = new RegExp(Year + "/" + Month + "/\\d{1,2}", "g");
        if (el.match(regex)) return true;
      });
      //TODO: TEST
      if (keys.length) console.log("DELETE:::", "visitors:state", keys);
      // if(keys.length) await this.client.hdel("visitors:state",...keys)
    }
  };
}
// master Function
async function masterFunc(fetchData) {
  let checkCount = 5;
  let container = [];
  for (let i = 0; i < checkCount; i++) {
    let Year = +moment()
      .subtract(i, "year")
      .format("YYYY");
    let { countryState, cityState } = await fetchData.fetchYearData(Year);
    if (!countryState || !cityState) {
      continue;
    }
    _.forIn(countryState, (value, key) => (countryState[key] = +value));
    cityState = cityConverter(cityState);
    const mainState = new MainState({
      Year,
      CountryState: countryState,
      CityState: cityState
    });
    //TODO: TEST
    let { monthState, dayModelCollection, visitorModel } =
      Year === +moment().format("YYYY")
        ? await CurrentYear(Year, +moment().format("MM"), fetchData)
        : await OtherYears(Year, 12, fetchData);
    // (Year === moment().format("YYYY"))
    //     ?   await Sample2(client,visitorsState,Year,moment().subtract(1,'month').format("MM"))
    //     :   await Sample(client,visitorsState,Year,12);
    monthState = new MonthState(monthState);
    monthState.DaysDetail = dayModelCollection;
    mainState.MonthsDetail = monthState;
    visitorModel.VisitorsState = monthState;
    container.push(mainState, ...dayModelCollection, monthState, visitorModel);
  }
  return container;
}
// subset Functions
async function CurrentYear(Year, month, fetchData) {
  for (let Month = month; Month > 0; Month--) {
    let {
      monthCountryState,
      monthCityState
    } = await fetchData.fetchCurrentMonthData(Year, Month);
    if (!monthCountryState || !monthCityState) {
      continue;
    }
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
    let visitor = await Visitors.findOne({ Year, Month });
    let visitorModel = visitor ? visitor : new Visitors({ Year, Month });
    let iterateCount = +moment(`${Year}/${Month}`, "YYYY/MM").daysInMonth();
    let visitorsDailyState = await fetchData.fetchDaysData();
    let dayModelCollection = [];
    for (let Day = 1; Day <= iterateCount; Day++) {
      let Dat = `${Year}/${Month}/${Day}`;
      let prevObj = visitorsDailyState[Dat];
      if (!prevObj) {
        continue;
      }
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
    return { monthState, dayModelCollection, visitorModel };
  }
}
async function OtherYears(Year, checkCount, fetchData) {
  for (let Month = 1; Month <= checkCount; Month++) {
    let {
      monthCountryState,
      monthCityState
    } = await fetchData.fetchOtherMonthsData(Year, Month);
    if (!monthCountryState || !monthCityState) {
      continue;
    }
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
    let visitor = await Visitors.findOne({ Year, Month });
    let visitorModel = visitor ? visitor : new Visitors({ Year, Month });
    let visitorsDailyState = await fetchData.fetchDaysData();
    let iterateCount = moment(`${Year}/${Month}`, "YYYY/MM").daysInMonth();
    let dayModelCollection = [];
    for (let Day = 1; Day <= iterateCount; Day++) {
      let Dat = `${Year}/${Month}/${Day}`;
      let prevObj = visitorsDailyState[Dat];
      if (!prevObj) {
        continue;
      }
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
    return { monthState, dayModelCollection, visitorModel };
  }
}
async function deleteDataFromRedis(fetchData) {
  this.checkCount = 5;
  this.deleteCurrentYear = async Year => {
    // Delete All Months Except Current Month
    let currentMonth = +moment().format("MM");
    for (let Month = 1; Month < currentMonth; Month++) {
      await fetchData.deleteMonthData(Year, Month);
      await fetchData.deleteDaysData(Year, Month);
    }
  };

  this.deleteOtherYears = async Year => {
    // Delete other Years all Months
    for (let Month = 1; Month <= 12; Month++) {
      await fetchData.deleteMonthData(Year, Month);
      await fetchData.deleteYearData(Year, Month);
      await fetchData.deleteDaysData(Year, Month);
    }
  };
  for (let i = 0; i < this.checkCount; i++) {
    let Year = +moment()
      .subtract(i, "year")
      .format("YYYY");
    let { countryState, cityState } = await fetchData.fetchYearData(Year);
    if (!countryState || !cityState) {
      continue;
    }
    Year === +moment().format("YYYY")
      ? deleteCurrentYear(Year)
      : deleteOtherYears(Year);
  }
}
module.exports = async (client, deferred) => {
  let config = { logBucket: "visitorsState" };
  const fetchData = new FetchData(client, deferred);
  let container = await masterFunc(fetchData);
  if (container.length === 0) {
    console.log(
      chalk.red(`[${config.logBucket}][Redis]`),
      "There Is An Error In Fetching YearData Data From Redis"
    );
    console.log(
      chalk.bold(
        "-------------------------------------------------------------"
      )
    );
    return deferred.resolve(client);
  }
  console.log(
    chalk.green(`[${config.logBucket}]`),
    "Saving Data To Database..."
  );
  Promise.all(container.map(el => el.save()))
    .then(async () => {
      console.log(
        chalk.green(`[${config.logBucket}]`),
        "Saved Data To Database..."
      );
      try {
        await deleteDataFromRedis(fetchData);
      } catch (e) {
        throw new Error(e.message);
      }
      console.log(
        chalk.green(`[${config.logBucket}]`),
        "Data Delete From Redis..."
      );
      console.log(
        chalk.bold(
          "-------------------------------------------------------------"
        )
      );
      deferred.resolve(client);
    })
    .catch(err => deferred.reject(err));
};
