module.exports = function FetchData({ config, client }) {
  this.client = client;
  if (config) this.redisBucket = config.redisBucket;
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
    // VisitorsStateStore
    fetchCurrentMonthData: async (Year, Month) => {
      let monthCountryState = await this.client.hgetall(
        `visitors:state:country:month:${Year}:${Month}`
      );
      let monthCityState = await this.client.hgetall(
        `visitors:state:city:month:${Year}:${Month}`
      );
      return { monthCountryState, monthCityState };
    },
    fetchYearData: async Year => {
      let countryState = await this.client.hgetall(
        `visitors:state:country:year:${Year}`
      );
      let cityState = await this.client.hgetall(
        `visitors:state:city:year:${Year}`
      );
      return { countryState, cityState };
    },
    fetchOtherMonthsData: async (Year, Month) => {
      let monthCountryState = await this.client.hgetall(
        `visitors:state:country:month:${Year}:${Month}`
      );
      let monthCityState = await this.client.hgetall(
        `visitors:state:city:month:${Year}:${Month}`
      );
      return { monthCountryState, monthCityState };
    },
    fetchDaysData: async () => {
      return await this.client.hgetall("visitors:state");
    },
    deleteMonthData: async (Year, Month) => {
      //TODO: TEST
      console.log("DELETE:::", `visitors:state:city:month:${Year}:${Month}`);
      console.log("DELETE:::", `visitors:state:country:month:${Year}:${Month}`);
      // await this.client.del(`visitors:state:city:month:${Year}:${Month}`)
      // await this.client.del(`visitors:state:country:month:${Year}:${Month}`)
    },
    deleteYearData: async Year => {
      //TODO: TEST
      console.log("DELETE:::", `visitors:state:city:year:${Year}`);
      console.log("DELETE:::", `visitors:state:country:year:${Year}`);
      // await this.client.del(`visitors:state:city:year:${Year}`)
      // await this.client.del(`visitors:state:country:year:${Year}`)
    },
    deleteDaysData: async (Year, Month) => {
      let dayState = await this.dayStateContainer;
      let keys = dayState.filter(el => {
        let regex = new RegExp(Year + "/" + Month + "/\\d{1,2}", "g");
        if (el.match(regex)) return true;
      });
      // TODO: TEST
      if (keys.length) console.log("DELETE:::", "visitors:state", keys);
      // if(keys.length) await this.client.hdel("visitors:state",...keys)
    },
    /* UsersStore
        FetchData <Constructor>
        Input:  config,client
        Output: getDataFromRedis <Function>, getUsersFromRedis <Function>
    */

    getDataFromRedis: async () => {
      let reply = await this.client.hgetall(this.redisBucket);
      if (!reply)
        throw new Error(`Nothing Exist In ${this.redisBucket} Bucket`);
      return reply;
    },
    getUsersFromRedis: async contain => {
      let reply = await this.client.smembers(`online:users:list:${contain}`);
      if (!reply)
        throw new Error(
          `Nothing Exist In < online:users:list:${contain} > To Store.`
        );
      if (typeof reply === "string") reply = JSON.parse(reply);
      return reply;
    },
    deleteKeysFromRedis: async delKeys => {
      // TODO: TEST <Uncomment reply1,reply2>
      console.log(...delKeys);
      // let reply1 = await this.client.hdel(this.redisBucket,...delKeys)
      // let reply2 = await this.client.srem(...delKeys.map(key=>"online:users:list:"+key))
      // if(reply1 === 0 || reply2 === 0 ) throw new Error('Couldn\'t Delete Data From Redis')
      // return reply1+reply2
    }
  };
};
