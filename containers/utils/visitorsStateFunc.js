const asyncRedis = require('async-redis')
const moment = require('moment')
let _ = require('lodash')

let MainState   = require('../../model/visitors/visitorsState')
let MonthState  = require('../../model/visitors/monthsVisitorsState');
let DayState    = require('../../model/visitors/daysDetailState')

let Visitors = require('../../model/visitors')

// Util Functions
function cityConverter(cityContainer){
    return _.transform(cityContainer, (result,cities, country) =>
        _.forIn(JSON.parse(cities),(count,city)=> result.push({ country, city, count }))
        ,[]
    )
}

// fetch Data from redis

function FetchData(client,deferred){
    this.client = client
    this.deferred = deferred
    return{
        fetchCurrentYearData:async(Year)=>{
            let countryState,cityState;
            try{
                countryState = await this.client.hgetall(`visitors:state:country:year:${Year}`)
                cityState = await this.client.hgetall(`visitors:state:city:year:${Year}`)
            }catch(error){ 
                console.log('Error:',error)
                this.deferred.reject(error)
            }
            return{countryState,cityState}
        },
        fetchCurrentMonthData:async(Year,Month)=>{
            let monthCountryState,monthCityState;
            try{
                monthCountryState = await this.client.hgetall(`visitors:state:country:month:${Year}:${Month}`)
                monthCityState = await this.client.hgetall(`visitors:state:city:month:${Year}:${Month}`)
            }catch(error){
                console.log('Error:',error)
                this.deferred.reject(error)  
            }
            return{monthCountryState,monthCityState}
        },
        fetchOtherYearsData:async(Year,Month)=>{
            let monthCountryState,monthCityState;
            try{
                 monthCountryState = await this.client.hgetall(`visitors:state:country:month:${Year}:${Month}`)
                 monthCityState = await this.client.hgetall(`visitors:state:city:month:${Year}:${Month}`)
            }catch(error){
                console.log('Error:',error)
                this.deferred.reject(error)  
            }
            return{monthCountryState,monthCityState}
        },
        fetchDaysData:async()=>{
            let visitorsDailyState ; 
            try{
                visitorsDailyState = await this.client.hgetall('visitors:state')
            }catch(error){
                console.log('Error:',error)
                this.deferred.reject(error)  
            }
            return visitorsDailyState
        }
    }
}
// master Function
async function masterFunc(client, deferred,fetchData){
    let checkCount = 5
    let container = []

    for (let i = 0; i < checkCount; i++) {
        let Year = +moment().subtract(i, 'year').format("YYYY")
        let {countryState,cityState} = await fetchData.fetchCurrentYearData(client,Year,deferred)
        if (!countryState && !cityState) { continue; }
        _.forIn(countryState,(value,key)=> countryState[key]=+value )
        cityState = cityConverter(cityState)
        
        const mainState = new MainState({ Year,CountryState:countryState,CityState:cityState })
        

        //TODO: Testing Purpose
        let {monthState,dayModelCollection,visitorModel} = Year === +moment().format("YYYY")
            ?   await CurrentYear(client,Year,+moment().format("MM"),deferred,mainState,fetchData)
            :   await OtherYears(client,Year,12,deferred,fetchData);
        
        monthState = new MonthState(monthState)
        monthState.DaysDetail = dayModelCollection
        mainState.MonthsDetail = monthState
        visitorModel.VisitorsState = monthState
        container.push(mainState,...dayModelCollection,monthState,visitorModel)
        // // (Year === moment().format("YYYY"))
        // //     ?   await Sample2(client,visitorsState,Year,moment().subtract(1,'month').format("MM"))
        // //     :   await Sample(client,visitorsState,Year,12);
    }
    return container
}

// subset Functions
async function CurrentYear(client,Year,month,deferred,fetchData){
    for(let Month=month;Month>0;Month--){
        let {monthCountryState,monthCityState} = await fetchData.fetchCurrentMonthData(client,Year,Month,deferred)
        if (!monthCountryState && !monthCityState) { continue; }
        _.forIn(monthCountryState,(value,key)=> monthCountryState[key]= +value )
        const monthState = { Year,Month,CountryState:monthCountryState,CityState:cityConverter(monthCityState) }
        let visitor = await Visitors.findOne({ Year,Month })
        let visitorModel = visitor ? visitor : new Visitors({ Year, Month })
        let iterateCount = +moment(`${Year}/${Month}`, "YYYY/MM").daysInMonth()
        let visitorsDailyState = await fetchData.fetchDaysData(client,deferred) 
        let dayModelCollection = []
        for (let Day = 1; Day <= iterateCount; Day++) {
            let Dat = `${Year}/${Month}/${Day}`
            let prevObj = visitorsDailyState[Dat]
            if (!prevObj) { continue; }
            let dayCountryState = {}
            let dayCityState = []
            _.forIn(JSON.parse(prevObj), (value, key) => {
                key = key.split(':')
                dayCityState.push({city:key[1],count:value})
                dayCountryState[key[0]]= dayCountryState[key[0]] ? dayCountryState[key[0]] + value : value; 
            })
            let dayState = new DayState({Date: Dat, CountryState: dayCountryState, CityState: dayCityState})
            dayModelCollection.push(dayState)
        }
        return {monthState,dayModelCollection,visitorModel}
    }
}
async function OtherYears(client,Year,checkCount,deferred,fetchData){
    for (let Month = 1; Month <= checkCount; Month++) {
        let {monthCountryState,monthCityState} = await fetchData.fetchOtherYearsData(client,Year,Month,deferred)
        if (!monthCountryState && !monthCityState) { continue; }
        _.forIn(monthCountryState,(value,key)=> monthCountryState[key]= +value )
        const monthState = { Year,Month,CountryState:monthCountryState,CityState:cityConverter(monthCityState) }
        let visitor = await Visitors.findOne({ Year,Month })
        let visitorModel = visitor ? visitor : new Visitors({ Year, Month })
        let visitorsDailyState = await fetchData.fetchDaysData(client,deferred)
        let iterateCount = moment(`${Year}/${Month}`, "YYYY/MM").daysInMonth()
        let dayModelCollection = []
        for (let Day = 1; Day <= iterateCount; Day++) {
            let Dat = `${Year}/${Month}/${Day}`
            let prevObj = visitorsDailyState[Dat]
            if (!prevObj) { continue; }
            let dayCountryState = {}
            let dayCityState = []
            _.forIn(JSON.parse(prevObj), (value, key) => {
                key = key.split(':')
                dayCityState.push({city:key[1],count:value})
                dayCountryState[key[0]]= dayCountryState[key[0]] ? dayCountryState[key[0]] + value : value; 
            })
            let dayState = new DayState({Date: Dat, CountryState: dayCountryState, CityState: dayCityState})
            dayModelCollection.push(dayState)
        }
        return {monthState,dayModelCollection,visitorModel}
    }
}

module.exports = async (client, deferred) => {
    const fetchData = new FetchData(client,deferred)
    let container = await masterFunc(client,deferred,fetchData)
    Promise.all(container.map(el=>el.save()))
        .then(async ()=>{
            console.log('Data has been saved Successfully...')
            await deferred.resolve(client)
        }).catch(err=>deferred.reject(err))
}