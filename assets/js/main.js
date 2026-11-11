(function () {
  "use strict";
  var C = window.BELS_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function rupiah(n) { return "Rp" + Number(n).toLocaleString("id-ID"); }
  function tanggal(iso) {
    var d = new Date(iso + "T00:00:00+07:00");
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  }

  /* ---------- Registration, price, contact (config-driven) ---------- */
  var regOpen = !!C.registrationUrl;
  $$(".js-register").forEach(function (a) {
    if (regOpen) {
      a.href = C.registrationUrl;
      a.target = "_blank";
      a.rel = "noopener";
    }
  });
  var regMain = $("#reg-main");
  if (regMain) regMain.textContent = regOpen ? "Daftar sekarang" : "Pendaftaran segera dibuka";

  if (C.price) $("#price").textContent = rupiah(C.price) + " / orang";

  if (C.registrationCloses) {
    var cl = $("#close");
    cl.textContent = "Pendaftaran reguler ditutup " + tanggal(C.registrationCloses) + ".";
    cl.hidden = false;
  }

  if (typeof C.seatsRemaining === "number") {
    var st = $("#seats");
    st.textContent = C.seatsRemaining > 0 ? "Tersisa " + C.seatsRemaining + " kursi" : "Kursi reguler penuh";
    st.hidden = false;
  }

  if (C.whatsapp) {
    var wa = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent("Halo panitia BELS 2026, saya ingin bertanya tentang The Journey.");
    ["#wa-main", "#wa-foot"].forEach(function (id) { var e = $(id); if (e) { e.href = wa; e.hidden = false; } });
  }

  var ig = $("#ig-foot");
  if (ig) {
    if (C.instagram) { ig.href = "https://www.instagram.com/" + C.instagram + "/"; ig.textContent = "@" + C.instagram; }
    else ig.hidden = true;
  }

  ["r3", "r4"].forEach(function (k) {
    var s = C.speakers && C.speakers[k];
    var el = $('[data-host="' + k + '"]');
    if (s && el) el.textContent = "Dipandu " + s.name + (s.org ? " · " + s.org : "");
  });

  if (C.showNeon) $("#neon").hidden = false;

  /* ---------- Countdown ---------- */
  var target = new Date(C.eventStart || "2026-11-26T11:00:00+07:00").getTime();
  var cd = $("#countdown");
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) {
      cd.innerHTML = '<p class="mono" style="color:#FF8A96">The Journey sedang berlangsung atau telah selesai. Terima kasih, founder.</p>';
      return false;
    }
    var d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
    $('[data-cd="d"]', cd).textContent = d;
    $('[data-cd="h"]', cd).textContent = pad(h);
    $('[data-cd="m"]', cd).textContent = pad(m);
    $('[data-cd="s"]', cd).textContent = pad(s);
    return true;
  }
  if (cd && tick()) {
    var timer = setInterval(function () { if (!tick()) clearInterval(timer); }, 1000);
  }

  /* ---------- Founder Compass (runs only in the browser, nothing is sent) ---------- */
  var DIM = [
    { k: "M", name: "Mindset · Jujur", items: [
      "Saya tahu hambatan mental yang paling sering menunda keputusan bisnis saya.",
      "Saat usaha tertekan, saya mencari solusi, bukan hanya bertahan.",
      "Saya berani mengambil risiko yang sudah saya ukur dan siap berubah arah (pivot) bila perlu."] },
    { k: "K", name: "Knowledge · Jernih", items: [
      "Saya tahu omzet, margin, dan arus kas usaha saya bulan ini.",
      "Uang pribadi dan uang usaha saya sudah terpisah.",
      "Saya paham dasar legalitas dan pajak usaha saya (NIB, HAKI, pajak)."] },
    { k: "S", name: "Skills · Mampu", items: [
      "Pekerjaan berulang di usaha saya sudah punya prosedur atau sistem.",
      "Tim atau mitra saya tahu tugas dan targetnya tanpa selalu saya ingatkan.",
      "Saya memakai alat digital atau otomasi untuk menghemat waktu usaha."] },
    { k: "R", name: "Responsibility · Bermakna", items: [
      "Saya bisa menjelaskan untuk siapa dan untuk apa usaha ini ada, selain untung.",
      "Saya menjalankan usaha dengan etika dan tata kelola yang bisa dipertanggungjawabkan.",
      "Usaha saya punya atau akan punya program dampak sosial atau lingkungan yang nyata."] }
  ];
  var form = $("#fc");
  if (form) {
    var html = "";
    DIM.forEach(function (d) {
      html += '<p class="fc-group">' + d.name + "</p>";
      d.items.forEach(function (txt, i) {
        var n = d.k + (i + 1);
        var opts = "";
        for (var v = 1; v <= 5; v++) {
          opts += '<label><input type="radio" name="' + n + '" value="' + v + '" aria-label="' + v + '"><span>' + v + "</span></label>";
        }
        html += '<div class="q"><fieldset><legend><span class="mono" style="color:#8a847b;margin-right:6px">' + n + "</span>" + txt + '</legend><div class="opts">' + opts + "</div></fieldset></div>";
      });
    });
    form.innerHTML = html;

    form.addEventListener("change", function () {
      var out = "", total = 0, answered = 0;
      var rows = DIM.map(function (d) {
        var sum = 0, got = 0;
        for (var i = 1; i <= 3; i++) {
          var e = form.querySelector('input[name="' + d.k + i + '"]:checked');
          if (e) { sum += +e.value; got++; }
        }
        answered += got;
        return { d: d, idx: got === 3 ? Math.round((sum - 3) / 12 * 100) : null };
      });
      if (answered < 12) {
        $("#fc-res").innerHTML = "<p>Terisi " + answered + " dari 12 butir. Lanjutkan untuk melihat hasil.</p>";
        return;
      }
      rows.forEach(function (r) {
        total += r.idx;
        var band = r.idx < 40 ? "perlu fondasi" : r.idx < 70 ? "berkembang" : "kuat";
        out += '<div class="fc-row"><span>' + r.d.name + ' <span class="fc-band">· ' + band + '</span></span><div class="track"><div class="fill" style="width:' + r.idx + '%"></div></div><b>' + r.idx + "</b></div>";
      });
      var avg = Math.round(total / 4);
      var low = rows.slice().sort(function (a, b) { return a.idx - b.idx; })[0];
      out += '<p class="fc-total">Total ' + avg + " / 100</p>";
      out += "<p>Ruang yang paling bisa membantu Anda hari ini: <b>" + low.d.name + "</b>. Di The Journey Anda tetap melewati keempatnya.</p>";
      $("#fc-res").innerHTML = out;
    });
  }
})();
