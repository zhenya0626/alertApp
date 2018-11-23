//app.js

'use strict'
var https = require('https');
var file = require('file-system');
var fs = require('fs');
var moment = require('moment');
const mysql = require('mysql');
const connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'F@1ryP3n9u1n',
    database : 'vems'
});


connection.connect();

let out = 
{ trend_p1: 
  { '1_year': null,
      '1_mon': null,
      '1_day': null,
      '1_hour':null,
      '1_min': null,
      '1_ch1': null,
      '1_ch2': null,
      '1_ch3': null,
      '1_ch4': null
  },
  trend_p2: 
  { '2_year': null ,
    '2_mon': null,
    '2_day':null,
    '2_hour':null,
    '2_min':null ,
    '2_ch1':null ,
    '2_ch2':null ,
    '2_ch3':null ,
    '2_ch4':null  
  },
  trend_p3: 
  { '3_year':null ,
    '3_mon':null ,
    '3_day':null ,
    '3_hour':null ,
    '3_min':null ,
    '3_ch1':null ,
    '3_ch2':null ,
    '3_ch3':null ,
    '3_ch4':null  
  },
  trend_p4: 
  { '4_year':null ,
    '4_mon':null ,
    '4_day':null ,
    '4_hour':null ,
    '4_min':null ,
    '4_ch1':null ,
    '4_ch2':null ,
    '4_ch3':null ,
    '4_ch4':null  },
  ai: 
    [ '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '' ] }

for(let p = 1; p<5; p++){
console.log("p",p);
    fs.readFile('../dl/trend_p'+ p +'.js', 'utf8', function (err, text) {
        let str = [];
        let data = {};
        str.push( p+"_year");
        str.push( p+"_mon");
        str.push( p+"_day");
        str.push( p+"_hour");
        str.push( p+"_min");
        str.push( p+"_ch1");
        str.push( p+"_ch2");
        str.push( p+"_ch3");
        str.push( p+"_ch4");
        text = text.replace(/]/g,'');
        for(let i = 0; i<str.length; i++){
            let strLocation = text.indexOf( str[i] );
            let end = text.slice(strLocation).search(/;/g) + strLocation;
            let start = text.slice(strLocation,end).lastIndexOf(',') + strLocation + 1;
            let tmp  = text.slice( start, end );
            data = Object.assign(data, {[str[i]]: parseFloat(tmp)});
        }
        out = Object.assign(out, {['trend_p'+p]: data});
    });
}

fs.readFile('../dl/data_ai.js', 'utf8', function (err, text) {
    let str = []
    str.push("ai_per");
    for(let i = 0; i<str.length; i++){
        let start = text.indexOf( str[i] );
        let end = text.indexOf(";", start);
        let ai = text.slice( start + str[i].length + 4 , end-1 );
        ai = ai.replace(/"/g,'');
        ai = ai.split(',');
        out = Object.assign(out,{ai:ai});
        console.log('out',out);

        let sql2 =`select state,alerted_at from rooms where name='A202';`; 
            connection.query(sql2, (err, rows, fields) => {
            if (err) throw err;
            const alerted_at = moment(rows[0].alerted_at);
            const nowTime = moment();
            const intervalTime = (nowTime.diff(alerted_at, 'hours') < 1) ? true : false;

            if(rows[0].state === 0) {
                console.log('state 0')
                if(((out['ai'][0] + out['ai'][1]) === '0.000.00') || isClassTime().A202 || intervalTime){
                    console.log('isClassTime().A202',isClassTime().A202);
                    console.log('!intervalTime',!intervalTime);
                } else {
                    changeRoomState(1,1);
                    PostAlert();
                }

            } else if(rows[0].state === 1) {
                console.log('state 1')
                if(((out['ai'][0] + out['ai'][1]) === '0.000.00') || isClassTime().A202 ){
                    changeRoomState(1,0);
                    setAllUserStateSql(0);
                    PushMessage('電気が消灯された、もしくはその教室の授業が始まりましたので,電気を消さなくて大丈夫です。ご協力ありがとうございました。');
                } else if (!intervalTime) {
                    PostAlert();
                }
            } else if(rows[0].state === 2) {
                console.log('state2 0');
                if((out['ai'][0] + out['ai'][1]) === '0.000.00'){
                    changeRoomState(1,0);
                    setAllUserStateSql(0);
                    PushMessageOne(userId, '電気が消灯されました。ありがとうございました。');
                    multicastClientSendMessageExceptForOne(userId, '電気が消灯されました！ご協力ありがとうございました。');
                } else if ((out['ai'][0] + out['ai'][1]) !== '0.000.00') {
                    let sql3 = `select userId from user where state=3;`;
                    connection.query(sql3, (err, rows, fields) => {
                      if (err) throw err;
                        console.log('userId', rows[0].userId);
                        const userId = rows[0].userId;
                        changeRoomState(1,1);
                        PushMessageOne(userId, '電気の消灯は確認できませんでした。もう一度消しに行く場合は『消しに行く』と入力してください。');
                    });
                }
            }
        });
    }
    connection.end();
});
function isClassTime() {
    let now = new Date();
    console.log('now.getDay', now.getDay());
    let dayOfWeek = now.getDay();  // youbi 0=nichi 1=getu 2=ka 3=sui 4=moku 5=kin 6=do
    let hour = now.getHours() ;	// 時
    let minute = now.getMinutes() ;	// 分

    let tmpObj = {
        A202: false,
        A203: false,
        factry: false
    };
    // 2=ka
    if(dayOfWeek === 2) {
        if ( hour>=9 && (hour<=10 && minute<=30) ){
            tmpObj.A202 = true;
            tmpObj.A203 = true;
        } else if ( (hour>=10  && minute>=40)&& (hour<=12 && minute<=10) ) {
            tmpObj.A202 = true;
            tmpObj.A203 = true;
        } else if ( (hour>=13  && minute>=0)&& (hour<=14 && minute<=30) ) {

        } else if ( (hour>=14  && minute>=40)&& (hour<=16 && minute<=10) ) {

        }
    // 3=sui
    } else if(dayOfWeek === 3) {
        if ( hour>=9 && (hour<=10 && minute<=30) ){
            tmpObj.A203 = true;
        } else if ( (hour>=10  && minute>=40)&& (hour<=12 && minute<=10) ) {  
            tmpObj.A203 = true;
        } else if ( (hour>=13  && minute>=0)&& (hour<=14 && minute<=30) ) {
            tmpObj.A202 = true;
            tmpObj.A203 = true;
        } else if ( (hour>=14  && minute>=40)&& (hour<=16 && minute<=10) ) {
            tmpObj.A203 = true;
        }  
    // 4=moku 
    } else if(dayOfWeek === 3) {
        if ( hour>=9 && (hour<=10 && minute<=30) ){

        } else if ( (hour>=10  && minute>=40)&& (hour<=12 && minute<=10) ) {  

        } else if ( (hour>=13  && minute>=0)&& (hour<=14 && minute<=30) ) {
            tmpObj.A202 = true;
        } else if ( (hour>=14  && minute>=40)&& (hour<=16 && minute<=10) ) {
            tmpObj.A202 = true;
        }   
    }

    return tmpObj
}

const changeRoomState = function (roomId, state) {
    let postData = {
        "state": state,
    };
    
    let postDataStr = JSON.stringify(postData);
    let options = {
        host: 'ncuvems.sda.nagoya-cu.ac.jp',
        port: 443,
        path: `/rooms/${roomId}/state`,
        method: 'POST',
        headers : {
            'Content-Type': 'application/json',
            "Content-Length": postDataStr.length
        },
    };

    return new Promise((resolve, reject) => {
        let req = https.request(options, (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
              body += chunk;
          });
          res.on('end', () => {
              resolve(body);
          });
        });

        req.on('error', (e) => {
            reject(e);
        });
        req.write(postDataStr);
        req.end();
    });
};



const PostAlert = function () {
    let options = {
        host: 'ncuvems.sda.nagoya-cu.ac.jp',
        port: 443,
        path: `/push/alert`,
        method: 'POST',
    };
    return new Promise((resolve, reject) => {
        let req = https.request(options, (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
              body += chunk;
          });
          res.on('end', () => {
              resolve(body);
          });
        });

        req.on('error', (e) => {
            reject(e);
        });
        // req.write(postDataStr);
        req.end();
    });
    
};
const PushMessage = function (message) {
    let postData = {
        "text": message,
    };
    
    let postDataStr = JSON.stringify(postData);

    let options = {
        host: 'ncuvems.sda.nagoya-cu.ac.jp',
        port: 443,
        path: `/push`,
        method: 'POST',
        headers : {
            'Content-Type': 'application/json',
            "Content-Length": postDataStr.length
        },
    };
    console.log(message);
    return new Promise((resolve, reject) => {
        let req = https.request(options, (res) => {
            let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
              body += chunk;
          });
          res.on('end', () => {
              resolve(body);
          });
        });

        req.on('error', (e) => {
            reject(e);
        });
        req.write(postDataStr);
        req.end();
    });
};
const PushMessageOne = (userId, textMessage) => {
  SendMessageObject = [
    {
      type: 'text',
      text: textMessage
    }];
    // multicastClientSendMessage(userIdArray, SendMessageObject)  //sousinnsitahitoigai
    multicastClientSendMessage([userId], SendMessageObject)  //test
    .then((body)=>{
        console.log(body);
    },(e)=>{console.log(e)});
}
const multicastClientSendMessageExceptForOne = (userId, textMessage) => {
  let sql3 = `select userId from user;`;
  connection.query(sql3, (err, rows, fields) => {
    if (err) throw err;
    console.log('userId', rows);
    let userIdArray = [];
    rows.forEach(element => {
      if(element.userId !== userId){
          userIdArray.push(element.userId);
      }
    });
    SendMessageObject = [
      {
        type: 'text',
        text: textMessage
      }];
      // multicastClientSendMessage(userIdArray, SendMessageObject)  //sousinnsitahitoigai
      multicastClientSendMessage(['Ud12eabeb5d98614b70d2edbbd9fc67be', 'U451892d8984210804955df6d5b32e8dd'], SendMessageObject)  //test
      .then((body)=>{
          console.log(body);
      },(e)=>{console.log(e)});
  });
}

const setAllUserStateSql = (state) => {
    let setUserStateSql = `update user set state=${state};`;
    connection.query(setUserStateSql, (err, rows, fields) => {
        if (err) throw err;
    });
}

