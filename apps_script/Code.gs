/**
 * 結婚式 ドレス色当てクイズ
 *
 * Googleフォームは自分で作成し、下の SETUP にフォームID・設問名・色を設定します。
 * フォームの設問名と選択肢は、SETUP の値と完全に一致させてください。
 */
const SETUP = Object.freeze({
  // GoogleフォームURLの /d/ と /edit の間にある文字列です。
  formId: '1CkbYEu-XtA0dNj-vdM-6Xe-N70hL7iFuZxAnPXWce4Y',

  sideQuestionTitle: 'どちらの招待客ですか？',
  groomSideLabel: '新郎側',
  brideSideLabel: '新婦側',
  groomNameQuestionTitle: 'あなたの名前を選んでください。',
  brideNameQuestionTitle: 'あなたの名前を選んでください。',
  colorQuestionTitle: 'カラードレスの色を予想してください',

  // フォームの色の選択肢と同じ表記にしてください。
  colors: ['ピンク', 'ブラウン', 'イエロー', '黄緑'],

  // 12文字以上の推測されにくい文字列に変更してください。
  adminKey: 'CHANGE_THIS_TO_A_LONG_RANDOM_KEY'
});

/** admin.html から呼ばれるWebアプリAPI。 */
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
    return createOutput_({success: false, error: error && error.message ? error.message : '取得に失敗しました。'}, callback);
  }
}

/** フォーム回答を取得し、同じ側・名前なら最後の回答だけを返す。 */
function getLatestResponses_() {
  validateSetup_();
  const form = FormApp.openById(SETUP.formId);
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
  validateSetup_();
  if (!providedKey || providedKey !== SETUP.adminKey) {
    throw new Error('管理者パスコードが正しくありません。');
  }
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
  if (!SETUP.formId || SETUP.formId === 'PASTE_YOUR_GOOGLE_FORM_ID_HERE') {
    throw new Error('SETUP.formId にGoogleフォームIDを設定してください。');
  }
  if (!SETUP.sideQuestionTitle || !SETUP.groomSideLabel || !SETUP.brideSideLabel ||
      !SETUP.groomNameQuestionTitle || !SETUP.brideNameQuestionTitle || !SETUP.colorQuestionTitle) {
    throw new Error('フォームの設問名・選択肢をSETUPに設定してください。');
  }
  if (!Array.isArray(SETUP.colors) || SETUP.colors.length < 2 ||
      SETUP.colors.some(function(color) { return !normalizeText_(color); })) {
    throw new Error('色の選択肢を2つ以上設定してください。');
  }
  if (!SETUP.adminKey || SETUP.adminKey === 'CHANGE_THIS_TO_A_LONG_RANDOM_KEY' || SETUP.adminKey.length < 12) {
    throw new Error('adminKeyを12文字以上の推測されにくい文字列に変更してください。');
  }
}
