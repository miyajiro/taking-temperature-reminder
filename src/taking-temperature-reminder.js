const channelToken = 'THIS_IS_CHANNEL_TOKEN';

const master_ss_url = 'THIS_IS_MASTER_SS_URL';
// コマ生名簿: 0 氏名, 
// コマ一覧: 0 名前, 1 日付, 2 開始時刻, 3 終了時刻, 4 場所

const answer_ss_url = 'THIS_IS_ANSWER_SS_URL'
// 2021芝Break検温フォーム回答: 0 タイムスタンプ, 1 氏名, 2 出欠席, 3 体温

const toAdr = 'THIS_IS_EMAIL_ADDRESS';

const form_url = 'THIS_IS_FORM_URL';

const group_id = 'THIS_IS_GROUP_ID';

function doPost(e) {
  var contents = e.postData.contents;
  var obj = JSON.parse(contents)
  var events = obj["events"];
  for(var i = 0; i < events.length; i++){
    if(events[i].type == "message"){
      reply_message(events[i]);
    }
  }
}

function pushConstMessage() {
  const message = 'test';
  pushMessage(message);
}

function reply_message(e) {
  const source_user_id = e.source.userId;
  const source_group_id = e.source.groupId;
  const source_room_id = e.source.roomId;

  const userMessage = e.message.text;
  console.log(userMessage);

  const getTokenQuery = '/q get_token %s,%s,%s';
  const validateGroupIdQuery = '/q validate_group_id';

  if (userMessage !== getTokenQuery && userMessage !== validateGroupIdQuery){
    return;
  }

  var ids = [source_user_id, source_group_id, source_room_id];

  var message = '';
  if(userMessage === getTokenQuery) {
    var concealedIds = ids.map(id => {
      if(id && id.length > 11){
        return id.substring(1, 9);
      } else {
        return "";
      }
    });
    message = concealedIds.join(",\n");
    MailApp.sendEmail(toAdr, 'group id', ids.join(',\n'));
  } else if (userMessage === validateGroupIdQuery) {
    message = ((group_id === source_group_id) ? '[PASS]group_id in this group matches the one on script.' : '[FAIL]group_id in this group does not match with the one on script.');
  }

  var postData = {
    "replyToken" : e.replyToken,
    "messages" : [
      {
        "type" : "text",
        "text" : message,
      }
    ]
  };
  var options = {
    "method" : "post",
    "headers" : {
      "Content-Type" : "application/json",
      "Authorization" : "Bearer " + channelToken,
    },
    "payload" : JSON.stringify(postData)
  };
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", options);
}

function notifyPractice(){ // 今日は練習があるということを報告する関数。既に日付は指定済み。
  const todayPracticeRows = getTodayPracticeRows();
  var message = 'こんばんは！\n日付変わりまして本日の予定です！\n\n';

  todayPracticeRows.forEach(todayPracticeRow => {
    const practiceDescription = '・' + todayPracticeRow[0] + ' ' + todayPracticeRow[2] + '~' + todayPracticeRow[3] + ' @' + todayPracticeRow[4] + '\n';
    message += practiceDescription;
  });

  message += '朝起きたら検温フォームへの回答をお願いします！\n\n' + form_url;

  pushMessage(message);
}

function remindToTakeTemperature(){ // 検温に答えていない人をコマ前にリマインドする。
  const nonAnsweredMemberList = getNonAnsweredMemberList();

  if(nonAnsweredMemberList.length === 0){
    const message = '本日は全員検温フォームに回答済みです。優秀！！'
    pushMessage(message);
    return;
  }

  var message = '検温フォーム未回答者一覧です。\n\n';
  nonAnsweredMemberList.forEach(nonAnsweredMember => {
    message += '- ' + nonAnsweredMember + '\n';
  })
  message += '\n回答お願いします！ここでリマインドされた方は回答し次第グループで報告をお願いします。';

  pushMessage(message);
}

function setTriggerIfTodayIsPracticeDay() {
  const todayPracticeRows = getTodayPracticeRows();
  if(todayPracticeRows.length === 0){
    return;
  }

  const now = new Date();
  const notifyPracticeTime = addMinutes(now, 2);
  
  const remindToTakeTemperatureTime = new Date(); 

  const practiceHours = todayPracticeRows.map(row => {
    return Number(row[2].split(':')[0]);
  });

  const minHour = Math.min(...practiceHours);

  remindToTakeTemperatureTime.setHours(minHour - 1);
  remindToTakeTemperatureTime.setMinutes(0);

  ScriptApp.newTrigger('notifyPractice').timeBased().at(notifyPracticeTime).create();
  ScriptApp.newTrigger('remindToTakeTemperature').timeBased().at(remindToTakeTemperatureTime).create();
}

function getTodayPracticeRows(){
  const master_ss = SpreadsheetApp.openByUrl(master_ss_url);
  const practiceSheetValues = master_ss.getSheetByName('コマ一覧').getDataRange().getValues();
  practiceSheetValues.shift();

  const todayRows = []; // 今日の練習リスト
  const today = new Date();
  practiceSheetValues.forEach(row => {
    const practiceDate = new Date(row[1]); // 日付は1.
    if(sameDate(practiceDate, today)){
      todayRows.push(row);
    }
  });
  return todayRows;
}

function getNonAnsweredMemberList(){
  const memberList = getMemberList();
  const answeredMemberSet = new Set(getAnsweredMemberList());

  const nonAnsweredMemberList = memberList.filter(member => (!answeredMemberSet.has(member)));

  return nonAnsweredMemberList;
}

function getAnsweredMemberList(){
  const answer_ss = SpreadsheetApp.openByUrl(answer_ss_url);
  const answerSheetValues = answer_ss.getSheetByName('2021芝Break検温フォーム回答').getDataRange().getValues();
  answerSheetValues.shift();

  const answeredMemberList = [];

  const today = new Date();
  answerSheetValues.forEach(row => {
    const timeStampDate = new Date(row[0]);
    if(sameDate(today, timeStampDate)){
      answeredMemberList.push(row[1]);
    }
  });

  return answeredMemberList;  
}

function getMemberList(){
  const master_ss = SpreadsheetApp.openByUrl(master_ss_url);
  const memberSheetValues = master_ss.getSheetByName('コマ生名簿').getDataRange().getValues();
  memberSheetValues.shift();
  const memberList = generateArray(memberSheetValues, 0);

  return memberList;
}

function generateArray(values, column){
  return values.map(record => record[column]).filter(value => value);
}

function sameDate(a, b){
  return (a.getDate() == b.getDate() && a.getMonth() == b.getMonth());
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}

function pushMessage(message) {
  const url = 'https://api.line.me/v2/bot/message/push';
  const options = {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + channelToken,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'to': group_id,
      'messages': [{
        'type': 'text',
        'text': message,
      }],
    }),
  };

  UrlFetchApp.fetch(url, options);
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}