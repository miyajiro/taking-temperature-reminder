function createEventForm(){
  var ss_url = 'THIS_IS_SS_URL';
  const ss = SpreadsheetApp.openByUrl(ss_url)
  const dataValues = ss.getSheetByName('コマ生名簿').getDataRange().getValues();
  dataValues.shift()

  const formTitle = '2021芝Break検温フォーム'; //タイトル
  
  const form = FormApp.create(formTitle);
  const formDescription = '日時は自動で記録されているのでコマ当日に記入してください。'
  
  form.setDescription(formDescription);

  form.addListItem()
    .setTitle('氏名')
    .setChoiceValues(generateArray(dataValues, 0))
    .setRequired(true);

  var bodyTemperatureValidation = FormApp.createTextValidation()
    .setHelpText('正常な体温の値を入力してください。')
    .requireNumberBetween(33.0, 43.0)
    .build();

  form.addTextItem()
    .setTitle('体温')
    .setRequired(true)
    .setValidation(bodyTemperatureValidation); 
}

function generateArray(values, column){
  return values.map(record => record[column]).filter(value => value);
}