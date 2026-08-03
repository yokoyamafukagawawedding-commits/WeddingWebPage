/**
 * 結婚式 ドレス色当てクイズ
 *
 * 1. SETUPを実際の招待客名・色・管理者キーに書き換える
 * 2. setupWeddingForm()を一度だけ実行する
 * 3. 実行ログの回答URLをWebサイトのconfig.jsへ設定する
 * 4. Webアプリとしてデプロイし、/exec URLもconfig.jsへ設定する
 */
const SETUP = Object.freeze({
  formTitle: 'ドレス色当てクイズ',
  formDescription: '新郎側・新婦側を選び、ご自身のお名前とカラードレスの予想を選択してください。複数回回答した場合は、最後の回答を抽選に使用します。',
  sideQuestionTitle: 'どちらの招待客ですか？',
  groomSideLabel: '新郎側',
  brideSideLabel: '新婦側',
  groomNameQuestionTitle: 'お名前（新郎側）',
  brideNameQuestionTitle: 'お名前（新婦側）',
  colorQuestionTitle: 'カラードレスの色を予想してください',

  // 必ず実際の招待客名に置き換えてください。
  groomGuests: ['新郎側ゲスト1', '新郎側ゲスト2', '新郎側ゲスト3'],
  brideGuests: ['新婦側ゲスト1', '新婦側ゲスト2', '新婦側ゲスト3'],
  colors: ['ピンク', 'ブルー', 'イエロー', 'パープル'],

  confirmationMessage: '投票ありがとうございました。当日はWebサイトのサイリウム画面から、投票した色を表示してください。',

  // 12文字以上の推測されにくい文字列に変更してください。
  adminKey: 'CHANGE_THIS_TO_A_LONG_RANDOM_KEY'
});

/** Googleフォームを新規作成し、フォームIDと管理者キーを保存する。 */
function setupWeddingForm() {
  validateSetup_();
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('FORM_ID')) {
    throw new Error('既にFORM_IDが保存されています。二重作成を避けるため停止しました。');
  }

  const form = FormApp.create(SETUP.formTitle);
  form
    .setDescription(SETUP.formDescription)
    .setProgressBar(true)
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(true)
    .setPublishingSummary(false)
    .setShuffleQuestions(false)
    .setConfirmationMessage(SETUP.confirmationMessage);

  if (form.supportsAdvancedResponderPermissions()) form.setPublished(true);
  form.setAcceptingResponses(true);

  // 1ページ目：招待側
  const sideItem = form.addMultipleChoiceItem()
    .setTitle(SETUP.sideQuestionTitle)
    .setRequired(true);

  // 2ページ目：新郎側の名前 → 色
  const groomPage = form.addPageBreakItem()
    .setTitle('新郎側の方')
    .setHelpText('ご自身のお名前を選択してください。');
  form.addListItem()
    .setTitle(SETUP.groomNameQuestionTitle)
    .setChoiceValues(SETUP.groomGuests)
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(SETUP.colorQuestionTitle)
    .setChoiceValues(SETUP.colors)
    .setRequired(true);

  // 3ページ目：新婦側の名前 → 色
  const bridePage = form.addPageBreakItem()
    .setTitle('新婦側の方')
    .setHelpText('ご自身のお名前を選択してください。');

  // 新郎側ページ完了後は、新婦側ページへ進まず送信する。
  bridePage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  form.addListItem()
    .setTitle(SETUP.brideNameQuestionTitle)
    .setChoiceValues(SETUP.brideGuests)
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(SETUP.colorQuestionTitle)
    .setChoiceValues(SETUP.colors)
    .setRequired(true);

  sideItem.setChoices([
    sideItem.createChoice(SETUP.groomSideLabel, groomPage),
    sideItem.createChoice(SETUP.brideSideLabel, bridePage)
  ]);

  properties.setProperties({FORM_ID: form.getId(), ADMIN_KEY: SETUP.adminKey});
  console.log('フォーム編集URL: %s', form.getEditUrl());
  console.log('フォーム回答URL: %s', form.getPublishedUrl());
  console.log('フォームID: %s', form.getId());
  return {editUrl: form.getEditUrl(), responderUrl: form.getPublishedUrl(), formId: form.getId()};
}

/** 静的なadmin.htmlから呼ばれるWebアプリAPI。 */
function doGet(e) {
  const callback = e && e.parameter ? String(e.parameter.callback || '') : '';
  try {
    const key = e && e.parameter ? String(e.parameter.key || '') : '';
    authorize_(key);
    const action = e && e.parameter ? String(e.parameter.action || 'responses') : 'responses';
    if (action !== 'responses') throw new Error('未対応の操作です。');
    return createOutput_(getLatestResponses_(), callback);
  } catch (error) {
    console.error(error);
    return createOutput_({success: false, error: error && error.message ? error.message : '処理に失敗しました。'}, callback);
  }
}

/** 同じ「招待側＋名前」は、時刻が最も新しい回答だけを返す。 */
function getLatestResponses_() {
  const formId = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  if (!formId) throw new Error('FORM_IDが未設定です。先にsetupWeddingForm()を実行してください。');

  const form = FormApp.openById(formId);
  const formResponses = form.getResponses();
  const validRows = [];

  formResponses.forEach(function(formResponse) {
    const answers = {};
    formResponse.getItemResponses().forEach(function(itemResponse) {
      const title = normalizeText_(itemResponse.getItem().getTitle());
      const response = itemResponse.getResponse();
      answers[title] = Array.isArray(response) ? response.map(normalizeText_).join(', ') : normalizeText_(response);
    });

    const side = answers[normalizeText_(SETUP.sideQuestionTitle)] || '';
    let name = '';
    if (side === SETUP.groomSideLabel) name = answers[normalizeText_(SETUP.groomNameQuestionTitle)] || '';
    else if (side === SETUP.brideSideLabel) name = answers[normalizeText_(SETUP.brideNameQuestionTitle)] || '';
    else name = answers[normalizeText_(SETUP.groomNameQuestionTitle)] || answers[normalizeText_(SETUP.brideNameQuestionTitle)] || '';

    const answer = answers[normalizeText_(SETUP.colorQuestionTitle)] || '';
    if (!side || !name || !answer) return;

    const timestamp = formResponse.getTimestamp();
    validRows.push({
      side: side,
      name: name,
      answer: answer,
      timestamp: timestamp.toISOString(),
      timestampMs: timestamp.getTime(),
      responseId: formResponse.getId() || ''
    });
  });

  validRows.sort(function(a, b) { return a.timestampMs - b.timestampMs; });
  const latestByPerson = {};
  validRows.forEach(function(row) {
    latestByPerson[row.side + '\u0000' + row.name] = row;
  });

  const latestRows = Object.keys(latestByPerson).map(function(k) {
    const r = latestByPerson[k];
    return {side: r.side, name: r.name, answer: r.answer, timestamp: r.timestamp, responseId: r.responseId};
  }).sort(function(a, b) {
    return a.side.localeCompare(b.side, 'ja') || a.name.localeCompare(b.name, 'ja');
  });

  return {
    success: true,
    formTitle: form.getTitle(),
    fetchedAt: new Date().toISOString(),
    rawCount: formResponses.length,
    validSubmissionCount: validRows.length,
    uniqueCount: latestRows.length,
    duplicateCount: Math.max(0, validRows.length - latestRows.length),
    invalidCount: Math.max(0, formResponses.length - validRows.length),
    colors: SETUP.colors.slice(),
    responses: latestRows
  };
}

function authorize_(providedKey) {
  const expectedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expectedKey) throw new Error('ADMIN_KEYが未設定です。先にsetupWeddingForm()を実行してください。');
  if (!providedKey || providedKey !== expectedKey) throw new Error('管理者パスコードが正しくありません。');
}

/** JSONPまたは通常JSONとして返す。 */
function createOutput_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
      return ContentService.createTextOutput(JSON.stringify({success:false,error:'callbackが不正です。'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function normalizeText_(value) {
  return String(value == null ? '' : value).replace(/\u3000/g, ' ').trim();
}

function validateSetup_() {
  if (!Array.isArray(SETUP.groomGuests) || !SETUP.groomGuests.length) throw new Error('新郎側の招待客名を設定してください。');
  if (!Array.isArray(SETUP.brideGuests) || !SETUP.brideGuests.length) throw new Error('新婦側の招待客名を設定してください。');
  if (!Array.isArray(SETUP.colors) || SETUP.colors.length < 2) throw new Error('候補色を2色以上設定してください。');
  if (!SETUP.adminKey || SETUP.adminKey === 'CHANGE_THIS_TO_A_LONG_RANDOM_KEY' || SETUP.adminKey.length < 12) {
    throw new Error('adminKeyを12文字以上の推測されにくい文字列へ変更してください。');
  }
  const names = SETUP.groomGuests.concat(SETUP.brideGuests).map(normalizeText_);
  if (names.some(function(name){return !name;})) throw new Error('招待客名に空欄があります。');
}

/** 管理者キーだけ後から変更する場合に使う。 */
function updateAdminKey() {
  const newKey = 'CHANGE_THIS_TO_ANOTHER_LONG_RANDOM_KEY';
  if (newKey.length < 12 || newKey.indexOf('CHANGE_THIS') === 0) throw new Error('newKeyを書き換えてください。');
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', newKey);
  console.log('管理者キーを更新しました。');
}
