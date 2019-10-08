// const util = require('util')


// module.exports = class DataTransfer {
//     constructor(){

//     }
//     static async fetchDataFromRedis(redis) {
//         let Rhgetall = util.promisify(redis.hgetall).bind(redis);
//        return await Rhgetall('online:users:TList').then(res=>console.log(res))
//     }
//     initialCheck(){

//     }
//     structuringCode(){

//     }
//     storeToMongDB(){

//     }
//     pruneRedis(){

//     }
// }


var deferred = Q.defer();
redis.hgetall('online:users:TList', (err, reply) => {
  // *InitialCheck
  if(!reply){ 
    console.log(chalk.green("[onlineUsersList][Redis]"),"Nothing Exist To Store.")
    deferred.resolve() 
  }
  if(typeof reply === "string"){ reply = JSON.parse(reply) }
  if(err){deferred.reject(new Error(e.message))}
  // *Prepare Code Structure to store
  let midContain = []
  let TempObj_small=(contain,reply,el)=>{
    let slimObj   = {}
    slimObj.Day   = +contain[2]
    slimObj.Count = reply[el]
    return slimObj
  } 
  let TempObj = (contain,reply,el,midContain)=>{
    let midObj    = {}
    let slimObj   = TempObj_small(contain,reply,el)
    midObj.Year   = +contain[0]
    midObj.Month  = +contain[1]
    midObj.onlineCount = []
    midObj.onlineCount.push(slimObj)
    midContain.push(midObj)
  }
  for (let el in reply) {
    let contain = el.split("/");
    if (+contain[0] <= EdgeYear && +contain[1] < EdgeMonth ) {
      if (midContain.length === 0) {
          TempObj(contain,reply,el,midContain)
      } else {
        let elem = midContain[midContain.length - 1]
        if(elem.Year === +contain[0] && elem.Month === +contain[1]){
          elem.onlineCount.push(TempObj_small(contain,reply,el))
        }else{ TempObj(contain,reply,el,midContain); }
      }
    }
  }
  // *start to implement storing to DB
  let arrLength = midContain.length;
  let modelContainer = []
  if( arrLength > 0 ){
    console.log(chalk.green("[onlineUsersList]"),'Saving Data To Database...')
    for(let i=0 ; i < arrLength ; i++ ){
        let {Year,Month,onlineCount} = midContain[i]
        // check if Usermodel exist append to that
        Users.findOne({Year,Month},(err,user)=>{
            if(err){deferred.reject(new Error(err.message))}
            let userModel = null
            user
                ?userModel = user
                :userModel = new Users({ Year,Month });
            let onlineCountModel = new onlineUsersCount({ Days:onlineCount })
            userModel.onlineCount.push(onlineCountModel)
            modelContainer.push(userModel,onlineCountModel)
        })
    }

    Promise.all(modelContainer.map(el=>el.save()))
    .then(()=>{
      console.log(chalk.green("[onlineUsersList]"),'Saved Data To Database...')
      // *Remove Data From Redis
        // redis.del('online:users:TList',(err,reply)=>{
        //   if(err){
        //     console.log(
        //       chalk.green("[onlineUsersList]"),
        //       chalk.white.bgRed("[ERROR]"),
        //       err.message)
        //     deferred.resolve()
        //   }
        //     console.log(chalk.green("[onlineUsersList]"),'removed from redis.')
        //     deferred.resolve();
        // })
        deferred.resolve();
    })
    .catch((e)=>{ deferred.reject(new Error(e.message)); })
  }
})
return deferred.promise;