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

let out = { 
  ai: [ '', '', '', '', '', '', '', '', '', '', '', '', '', '', '' ],
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
    }

    connection.connect();
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
                console.log('state 0')
                changeRoomState(1,1)
                PostAlert();
            }
            return;
        } else if(rows[0].state === 1) {
            console.log('state 1')
            console.log('intervalTime', intervalTime)
            if(((out['ai'][0] + out['ai'][1]) === '0.000.00') || isClassTime().A202 ){
                multicastTextMessage('電気が消灯された、もしくはその教室の授業が始まりましたので,電気を消さなくて大丈夫です。ご協力ありがとうございました。')
                changeRoomState(1,0)
                setAllUserState(0)

            } else if (!intervalTime) {
                PostAlert();
            }
        } else if(rows[0].state === 2) {
            console.log('state 2');
            let count3UserSql = `select COUNT(userId) AS count from user where state=3;`;
            connection.query(count3UserSql, (err, users1, fields) => {
                if (err) throw err;
                if (users1[0].count == 0){ 
                    console.log('ariena~i!!')
                    return;
                }
                let select3UserSql = `select userId from user where state=3;`;
                connection.query(select3UserSql, (err, users, fields) => {
                    if (err) throw err;
                    console.log('userId', users);
                    const userId = users[0].userId;
                        
                    if((out['ai'][0] + out['ai'][1]) === '0.000.00'){
                        setPointAndPushThanksMessage(userId, 5);
                        multicastTextExceptForOne(userId, '電気が消灯されました！ご協力ありがとうございました。');
                        changeRoomState(1,0);
                        setAllUserState(0);
                    } else if ((out['ai'][0] + out['ai'][1]) !== '0.000.00') {
                        changeRoomState(1,1);
                        changeUserState(userId, 0);
                        PushTextMessageOne(userId, '電気の消灯は確認できませんでした。もう一度消しに行く場合は『消しに行く』と入力してください。');
                    }
                });
            });
        }
    });

    // connection.end();
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
    let setUserStateSql = `update rooms set state=${state} where id=${roomId};`;
    connection.query(setUserStateSql, (err, rows, fields) => {
        if (err) throw err;
    });
};
const setAllUserState = (state) => {
    let setUserStateSql = `update user set state=${state};`;
    connection.query(setUserStateSql, (err, rows, fields) => {
        if (err) throw err;
    });
}
const changeUserState = (userId, state) => {
    let setUserStateSql = `update user set state=${state} where userId='${userId}';`;
    connection.query(setUserStateSql, (err, rows, fields) => {
        if (err) throw err;
    });
}
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

const multicastMessageObject = function (userIdArray, SendMessageObject) {
    let postData = {
        userIdArray: userIdArray,
        SendMessageObject: SendMessageObject,
    };
    
    let postDataStr = JSON.stringify(postData);
    console.log('postDataStr', postDataStr);

    let options = {
        host: 'ncuvems.sda.nagoya-cu.ac.jp',
        port: 443,
        path: `/push`,
        method: 'POST',
        headers : {
            'Content-Type': 'application/json',
            // "Content-Length": postDataStr.length
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

const multicastTextMessage = function (textMessage) {
    let sql3 = `select userId from user;`;
    connection.query(sql3, (err, rows, fields) => {
        if (err) throw err;
        console.log('userId', rows);
        let userIdArray = [];
        rows.forEach(element => {
            userIdArray.push(element.userId);
        });
        const SendMessageObject = [
        {
            type: 'text',
            text: textMessage
        }];
        // multicastMessageObject(userIdArray, SendMessageObject)  //sousinnsitahitoigai
        multicastMessageObject(['Ud12eabeb5d98614b70d2edbbd9fc67be', 'U451892d8984210804955df6d5b32e8dd'], SendMessageObject)  //test
        .then((body)=>{
            console.log(body);
        },(e)=>{console.log(e)});
    });
};

const multicastTextExceptForOne = (userId, textMessage) => {
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
    const SendMessageObject = [
      {
        type: 'text',
        text: textMessage
      }];
      // multicastMessageObject(userIdArray, SendMessageObject)  //sousinnsitahitoigai
      multicastMessageObject(['Ud12eabeb5d98614b70d2edbbd9fc67be', 'U451892d8984210804955df6d5b32e8dd'], SendMessageObject)  //test
      .then((body)=>{
          console.log(body);
      },(e)=>{console.log(e)});
  });
}

const PushTextMessageOne = (userId, textMessage) => {
    const SendMessageObject = [
    {
        type: 'text',
        text: `${textMessage}`
    }];
    multicastMessageObject([`${userId}`], SendMessageObject)
    .then((body)=>{
        console.log(body);
    },(e)=>{console.log(e)});
}
  
const setPointAndPushThanksMessage = (userId, point) => {
    let sql = `update user set count = count + ${point} where userId='${userId}';`;
    connection.query(sql, (err, rows, fields) => {
    if (err) throw err;
    let sql2 = `select *, (select count(*) + 1 from user b where b.count > a.count) as ranking from user a where userId='${userId}';`;
    connection.query(sql2, (err, rows, fields) => {
        if (err) throw err;
        let SendMessageObject = [{
            type: 'text',
            text: 'ありがとうございます!!'
        },{
            type: 'text',
            text: `ランキング ${rows[0].ranking}位　現在の獲得ポイントは${rows[0].count*10}Pです。`
        },{
            type: 'text',
            text: 'https://ncuvems.sda.nagoya-cu.ac.jp'
        }];
        multicastMessageObject([`${userId}`], SendMessageObject)
        .then((body)=>{
            console.log(body);
        },(e)=>{console.log(e)});
    });
    });
}

