//app.js

'use strict'
var https = require('https');
var file = require('file-system');
var fs = require('fs');
var moment = require('moment');
var test = true;
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
    let sql2 =`select state,alerted_at,used_at,confirm from rooms where name='A202';`; 
        connection.query(sql2, (err, rows, fields) => {
        if (err) throw err;
        const alerted_at = moment(rows[0].alerted_at);
        const used_at = moment(rows[0].used_at);
        const nowTime = moment();
        const alert_intervalTime = (nowTime.diff(alerted_at, 'hours') < 1) ? true : false;
        const used_intervalTime = (nowTime.diff(used_at, 'hours') < 1) ? true : false;
        const intervalTime = alert_intervalTime || used_intervalTime;
        const confirm = rows[0].confirm;
        if(rows[0].state === 0) {
            console.log('state 0')
            if(((out['ai'][0] + out['ai'][1]) === '0.000.00') || isClassTime().A202 || intervalTime){
            // if(false){
                console.log('isClassTime().A202',isClassTime().A202);
                console.log('!intervalTime',!intervalTime);
            } else {
                console.log('state 0')
                changeRoomState(1,1)
                PostAlert();
                setLog(0,1,'alert');
            }
            return;
        } else if(rows[0].state === 1) {
            console.log('state 1')
            console.log('intervalTime', intervalTime)
            console.log('isClassTime().A202',isClassTime().A202)
            if(((out['ai'][0] + out['ai'][1]) === '0.000.00') || isClassTime().A202 ){
                multicastTextMessage('電気が消灯された、もしくはその教室の授業が始まりましたので,電気を消さなくて大丈夫です。ご協力ありがとうございました。')
                changeRoomState(1,0)
                setAllUserState(0)
                changeRoomConfirm(1,0);
                setLog(1,0,'電気が消された or 授業が始まった');
            } else if (!intervalTime) {
                setLog(1,1,'alert2');
                PostAlert();
            }
        } else if(rows[0].state === 2) {
            console.log('state 2');
            let count3UserSql = `select COUNT(userId) AS count from user where state=3;`;
            connection.query(count3UserSql, (err, users1, fields) => {
                if (err) throw err;
                if (users1[0].count == 0){ 
                    console.log('ariena~i!!')
                    setLog(2,2,'ariena~i!!');
                    return;
                }
                let select3UserSql = `select userId from user where state=3;`;
                connection.query(select3UserSql, (err, users, fields) => {
                    if (err) throw err;
                    console.log('userId', users);
                    const userId = users[0].userId;
                    
                    
                    if((out['ai'][0] + out['ai'][1]) === '0.000.00'){
                    // if(false){
                        setPointAndPushThanksMessage(userId, 5);
                        multicastTextExceptForOne(userId, '電気が消灯されました！ご協力ありがとうございました。');
                        changeRoomState(1,0);
                        setAllUserState(0);
                        setLog(2,0,'消灯を確認しました');
                        changeRoomConfirm(1,0);
                    } else {
                        if (confirm == 0) {
                            changeRoomConfirm(1,confirm+1);
                        } else if(confirm > 0){
                            changeRoomState(1,1);
                            changeUserState(userId, 0);
                            PushTextMessageOne(userId, '電気の消灯は確認できませんでした。もう一度消しに行く場合は『消しに行く』と入力してください。');
                            setLog(2,1,'消灯を確認できませんでした');
                        }
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
        if ( (hour==8 && minute>=57) || (hour==10 && minute<=33) ){
            tmpObj.A202 = true;
            tmpObj.A203 = true;
        } else if ( (hour==10  && minute>=37) || hour==11 || (hour==12 && minute<=13) ) {
            tmpObj.A202 = true;
            tmpObj.A203 = true;
        } else if ( (hour==12 && minute>=57)|| (hour==14 && minute<=33)) {

        } else if ( (hour==14  && minute>=37) || hour==15 || (hour==16 && minute<=13) ) {

        }
    // 3=sui
    } else if(dayOfWeek === 3) {
        if ( (hour==8 && minute>=57) || (hour==10 && minute<=33) ){
            tmpObj.A203 = true;
        } else if ( (hour==10  && minute>=37) || hour==11 || (hour==12 && minute<=13)) {  
            tmpObj.A203 = true;
        } else if ( (hour==12 && minute>=57)|| (hour==14 && minute<=33)) {
            tmpObj.A202 = true;
            tmpObj.A203 = true;
        } else if ( (hour==14  && minute>=37) || hour==15 || (hour==16 && minute<=13) ) {
            tmpObj.A203 = true;
        }  
    // 4=moku 
    } else if(dayOfWeek === 3) {
        if ( (hour==8 && minute>=57) || (hour==10 && minute<=33) ){

        } else if ( (hour==10  && minute>=37) || hour==11 || (hour==12 && minute<=13)) {  

        } else if ( (hour==12 && minute>=57)|| (hour==14 && minute<=33)) {
            tmpObj.A202 = true;
        } else if ( (hour==14  && minute>=37) || hour==15 || (hour==16 && minute<=13) ) {
            tmpObj.A202 = true;
        }   
    }

    return tmpObj
}
const changeRoomConfirm = function (roomId, confirm) {
    let setUserStateSql = `update rooms set confirm=${confirm} where id=${roomId};`;
    connection.query(setUserStateSql, (err, rows, fields) => {
        if (err) throw err;
    });
};
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
const setLog = (room_state_prev, room_state_next, memo='') => {

    let sql = `
    insert into vems.logs
    (is_server, room_state_prev, room_state_next, memo)
    values
    (1,${room_state_prev},${room_state_next},'${memo}')`;

    connection.query(sql, (err, rows, fields) => {
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
        if(test){
            multicastMessageObject(['Ud12eabeb5d98614b70d2edbbd9fc67be'], SendMessageObject)  //test
            .then((body)=>{
                console.log(body);
            },(e)=>{console.log(e)});
        } else {
            multicastMessageObject(userIdArray, SendMessageObject) 
            .then((body)=>{
                console.log(body);
            },(e)=>{console.log(e)});
        }
        
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

        if(test){
            multicastMessageObject(['Ud12eabeb5d98614b70d2edbbd9fc67be'], SendMessageObject)  //test
            .then((body)=>{
                console.log(body);
            },(e)=>{console.log(e)});
        } else {
            multicastMessageObject(userIdArray, SendMessageObject) 
            .then((body)=>{
                console.log(body);
            },(e)=>{console.log(e)});
        }
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

