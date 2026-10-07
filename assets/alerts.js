/* "입국 규정·환율 바뀌면 알려드려요" subscription card + visitor Q&A.
 * Renders into [data-kt-alert] and [data-kt-qa] placeholders only when the backend store is connected,
 * so nobody is asked for an email the site can't keep. */
(function () {
  const C = window.KT_CONFIG || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const post = (u, b) => fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json().then(j => ({ ok: r.ok, j })).catch(() => ({ ok: r.ok, j: {} })));
  const kakao = () => (C.KAKAO_CHANNEL_URL ? `<a class="bookbtn" href="${esc(C.KAKAO_CHANNEL_URL)}" target="_blank" rel="noopener">카카오톡 채널로 받기</a>` : "") + (C.KAKAO_OPENCHAT_URL ? `<a class="bookbtn" href="${esc(C.KAKAO_OPENCHAT_URL)}" target="_blank" rel="noopener">여행자 오픈채팅 참여</a>` : "");

  function alertCard(el, st) {
    const d = el.dataset, name = d.name, cur = d.cur, unit = d.unit, rate = parseFloat(d.rate || "0");
    const fx = cur && unit && rate ? `<label class="al-row"><input type="checkbox" name="fxOn"> <span><b>${esc(unit)}</b>이 <input class="al-num" name="fxBelow" inputmode="decimal" placeholder="${Math.floor(rate * 0.98 * 100) / 100}">원 이하가 되면 알림</span></label>` : "";
    el.innerHTML = `<h2>${esc(name)} 입국 규정·환율, 바뀌면 알려드려요</h2>
<p>무비자 기간·입국신고 같은 규정이 바뀌거나 목표 환율에 닿으면 이메일로 바로 알려 드립니다. 여행 준비 체크리스트도 함께 보내 드려요.</p>
<form class="al-form" novalidate>
<label class="al-row"><input type="checkbox" name="entry" checked> <span>${esc(name)} 입국 규정 변경 알림</span></label>
${fx}
<input class="al-in" name="email" type="email" inputmode="email" autocomplete="email" placeholder="이메일 주소" required>
${st.sms ? `<input class="al-in" name="phone" inputmode="numeric" autocomplete="tel" placeholder="휴대폰 번호 (선택, 문자로도 받기)">` : ""}
<input name="hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
<label class="al-row"><input type="checkbox" name="consent"> <span>[필수] 개인정보 수집·이용 동의</span></label>
<details class="al-terms"><summary>수집·이용 내용 보기</summary>
<p>수집 항목: 이메일 주소${st.sms ? ", 휴대폰 번호(입력 시)" : ""}, 관심 여행지, 알림 설정<br>이용 목적: 입국 규정·환율 변경 알림, 여행 준비 체크리스트 발송<br>보유 기간: 알림 해지 시 즉시 파기(모든 알림에 해지 링크 포함)<br>동의를 거부할 수 있으며, 거부하면 알림을 받을 수 없습니다. <a href="/privacy">개인정보처리방침</a></p></details>
<label class="al-row"><input type="checkbox" name="age14"> <span>[필수] 만 14세 이상입니다</span></label>
<label class="al-row"><input type="checkbox" name="marketing"> <span>[선택] 여행 혜택·제휴 할인 소식(광고성 정보) 수신 동의</span></label>
${st.sms ? `<label class="al-row" data-sms hidden><input type="checkbox" name="smsConsent"> <span>[선택] 문자(SMS)로 알림 받기 동의</span></label>` : ""}
<div class="bookgrid auto"><button class="bookbtn" type="submit">알림 받기</button>${kakao()}<a class="bookbtn" href="/trips/${esc(d.d)}/checklist">준비 체크리스트 보기</a></div>
<p class="al-msg" role="status" aria-live="polite"></p>
</form>`;
    el.hidden = false;
    const f = el.querySelector("form"), msg = el.querySelector(".al-msg");
    const ph = f.phone, smsRow = el.querySelector("[data-sms]");
    if (ph && smsRow) ph.addEventListener("input", () => { smsRow.hidden = !ph.value.trim(); });
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const email = f.email.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = "이메일 주소를 확인해 주세요."; return; }
      if (!f.consent.checked || !f.age14.checked) { msg.textContent = "필수 항목(개인정보 수집·이용, 만 14세 이상)에 동의해 주세요."; return; }
      const phone = ph ? ph.value.replace(/\D/g, "") : "";
      if (phone && !(f.smsConsent && f.smsConsent.checked)) { msg.textContent = "문자로 받으려면 문자 수신에 동의해 주세요."; return; }
      const body = { email, phone, dest: d.d, entry: f.entry.checked, consent: true, age14: true, marketing: f.marketing.checked, smsConsent: !!(f.smsConsent && f.smsConsent.checked), hp: f.hp.value,
        ...(f.fxOn && f.fxOn.checked && parseFloat(f.fxBelow.value || f.fxBelow.placeholder) ? { fxCur: cur, fxBelow: parseFloat(f.fxBelow.value || f.fxBelow.placeholder) } : {}) };
      msg.textContent = "신청 중…";
      const { ok, j } = await post("/api/sub", body).catch(() => ({ ok: false, j: {} }));
      if (!ok) { msg.textContent = j.error === "phone" ? "휴대폰 번호를 확인해 주세요." : "잠시 후 다시 시도해 주세요."; return; }
      f.querySelectorAll("input,button").forEach(x => { if (x.type !== "hidden") x.disabled = true; });
      msg.textContent = j.confirmed ? "알림 설정을 업데이트했어요." : j.mailed ? "확인 메일을 보냈어요. 메일의 버튼을 누르면 알림이 시작됩니다." : "신청이 접수됐어요. 곧 확인 메일을 보내 드릴게요.";
    });
  }

  async function qaBox(el) {
    const d = el.dataset.d, name = el.dataset.name;
    const r = await fetch("/api/ask?d=" + encodeURIComponent(d)).then(x => x.json()).catch(() => null);
    if (!r || !r.ready) return;
    el.innerHTML = `<h2>${esc(name)} 여행자 질문</h2>${(r.items || []).map(o => `<details><summary>${esc(o.q)}</summary><p>${esc(o.a)}</p></details>`).join("") || `<p class="sub">아직 질문이 없어요. 첫 질문을 남겨 주세요.</p>`}
<form class="al-form ask"><input class="al-in" name="q" maxlength="300" placeholder="${esc(name)} 여행, 궁금한 걸 물어보세요"><input name="hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true"><div class="bookgrid auto"><button class="bookbtn" type="submit">질문 남기기</button></div><p class="al-msg" role="status" aria-live="polite">답변이 달리면 이 페이지에 공개됩니다. 개인정보·연락처는 적지 마세요.</p></form>`;
    el.hidden = false;
    const f = el.querySelector("form"), msg = el.querySelector(".al-msg");
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const q = f.q.value.trim(); if (q.length < 6) { msg.textContent = "조금만 더 자세히 적어 주세요."; return; }
      const { ok, j } = await post("/api/ask", { d, q, hp: f.hp.value }).catch(() => ({ ok: false, j: {} }));
      msg.textContent = ok ? "질문이 접수됐어요. 답변이 달리면 이 페이지에 공개됩니다." : j.error === "blocked" ? "링크·연락처는 적을 수 없어요." : "잠시 후 다시 시도해 주세요.";
      if (ok) f.q.value = "";
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const cards = document.querySelectorAll("[data-kt-alert]"), qas = document.querySelectorAll("[data-kt-qa]");
    if (cards.length) { const st = await fetch("/api/sub").then(r => r.json()).catch(() => null); if (st && st.ready) cards.forEach(el => alertCard(el, st)); }
    qas.forEach(qaBox);
  });
})();
