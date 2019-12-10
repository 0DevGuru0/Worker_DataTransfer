// require('events').EventEmitter.defaultMaxListeners = 20;
        
        // let question = [{
        //     type: 'rawlist',
        //     name: 'transferMethod',
        //     default: 'manual',
        //     message: 'Which method would you prefer to transfer data?',
        //     choices: ['manual', 'auto']
        // },{
        //     type: 'list',
        //     name: 'autoMethod',
        //     default: 'all',
        //     message: 'Which method would you prefer to auto transfer data?',
        //     choices: ['allBuckets', 'customBuckets'],
        //     when:({transferMethod})=>transferMethod==='auto' 
        // }];
        // return ask.prompt(question).then(({autoMethod})=>
        //     !autoMethod
        //         ? this.manual(inter) 
        //         : autoMethod === "allBuckets" ? this.autoAll() : this.autoBucket()
        // )  

        // if (process.platform === "win32") {
        //         var rl = require("readline").createInterface({
        //                 input: process.stdin,
        //                 output: process.stdout
        //         });
                
        //         rl.on("SIGINT", function () {
        //                 console.log('ok')
        //                 process.emit("SIGINT");
        //         });
        // }
                
        // process.on("SIGINT", function () {
        //         //graceful shutdown
        //         rl.close()
        //         console.log('oksd')
        //         // process.exit();
        // });
       
       
       
        // console.log('screen size has changed!');

        // process.stdout.on('resize', () => {
        //         console.log('screen size has changed!');
        //         console.log('screen size has changed!');
        //         console.log('screen size has changed!');
        //         console.log(`${process.stdout.columns}x${process.stdout.rows}`);
        //       });

        // let exitAllow = 0
        // let readLine = require("readline")
        // readLine.emitKeypressEvents(process.stdin);
        // process.stdin.setRawMode(true);
        // var rl =readLine.createInterface({ input: process.stdin, output: process.stdout });

        // rl.on("SIGINT",()=>process.emit("SIGINT"));

        // process.stdin.on('keypress', (str, key) =>{
        //         console.log(key.name)
        //         if (!(key.ctrl && key.name === 'c')) exitAllow = 0 
        // });
        // process.on("SIGINT",()=>{
        //         if(exitAllow<1){
        //             console.log('\r\n(To exit, press ^C again or ^D or type .exit)')
        //             exitAllow++
        //         }else{
        //             exitAllow = 0
        //             process.exit()
        //         }
        // });
        let readLine = require("readline")
        var rl =readLine.createInterface({ input: process.stdin, output: process.stdout });

        rl.write('Delete this!');
        // Simulate Ctrl+u to delete the line written previously
        rl.write(null, { ctrl: false, name: 'return' });
        rl.write(null, { ctrl: false, name: 'return' });
        rl.write(null, { ctrl: false, name: 'return' });
        rl.write(null, { ctrl: false, name: 'return' });
        rl.write(null, { ctrl: false, name: 'return' });
        rl.write(null, { ctrl: false, name: 'return' });
        rl.write(null, { ctrl: false, name: 'return' });
        rl.write(null, { ctrl: false, name: 'return' });
