// ✅ PREDEFINED WISH MESSAGES BY RELATION
const wishes = {
  gf: [
    "You are my heartbeat ❤️ Wishing you a beautiful and lovely New Year!",
    "Every moment with you feels magical 💖 Happy New Year my love!",
    "My world is complete because of you 💕 New Year, same love!"
  ],
  bf: [
    "You are my strength and my smile 💙 Happy New Year my hero!",
    "Life feels perfect because of you 🥰 New Year, new memories!",
    "Forever yours, today and always 💖 Happy New Year my love!"
  ],
  friend: [
    "True friendship is rare, and I’m lucky to have you 🔥 Happy New Year!",
    "Cheers to late nights, crazy laughs & endless memories 🥳",
    "You are not just my friend, you are family 💪 Happy New Year!"
  ],
  sister: [
    "My lovely sister, you make my life brighter 💖 Happy New Year!",
    "You are my best secret keeper and best friend too 💕",
    "Lucky to have a sister like you 👧 Wishing you the best year!"
  ],
  brother: [
    "You are my lifelong support system 💪 Happy New Year brother!",
    "My brother, my pride 😎 Wishing you success and happiness!",
    "No matter what, I always have your back 👑 Happy New Year!"
  ],
  family: [
    "My family is my biggest blessing ❤️ Happy New Year to all of you!",
    "With family by my side, life feels perfect 🙏",
    "Love, care and happiness — that’s what family means 💕"
  ],
  trending: [
    "New Year, new dreams, same unstoppable energy 🔥",
    "Fresh start, fresh goals, fresh vibes ✨",
    "This year is mine, and I’m ready to shine 😎"
  ]
};


// ✅ LOAD AUTO DESCRIPTIONS ON RELATION CHANGE
function loadWishes(){
  const relation = document.getElementById("relation")?.value;
  const box = document.getElementById("wishList");
  if(!box) return;

  box.innerHTML = "";

  if(!relation || !wishes[relation]) return;

  wishes[relation].forEach(text => {
    const btn = document.createElement("button");
    btn.innerText = text;
    btn.style.margin = "5px 0";
    btn.type = "button"; // ✅ safety

    btn.onclick = () => {
      const msg = document.getElementById("message");
      if(msg) msg.value = text;
    };

    box.appendChild(btn);
  });
}


// ✅ CREATE WISH (TOKEN SAFE + OWNER LINK + VALIDATION + ERROR HANDLING)
function createWish(){

  // ✅ FORM VALIDATION
  if(!from?.value || !to?.value || !message?.value){
    alert("❌ Please fill all fields before creating wish");
    return;
  }

  const token = localStorage.getItem("token");
  if(!token){
    alert("❌ Login required to create wish");
    return;
  }

  const fd = new FormData();
  fd.append("from", from.value);
  fd.append("to", to.value);
  fd.append("message", message.value);

  if(photo?.files?.length > 0){
    fd.append("photo", photo.files[0]);
  }

  // ✅ BUTTON DISABLE (ANTI DOUBLE CLICK)
  if(window.createBtn) createBtn.disabled = true;

  fetch("/api/wish",{
    method:"POST",
    headers:{ 
      "authorization": token   // ✅ same as your backend
    },
    body:fd
  })
  .then(r => r.json())
  .then(d => {

    if(!d.link){
      alert("❌ Wish not created, try again");
      return;
    }

    const ownerLink = d.link + "&owner=1";
    if(result){
      result.innerHTML = `✅ <a href='${ownerLink}' target="_blank">Open Your Wish</a>`;
    }

    // ✅ AUTO RESET FORM
    from.value = "";
    to.value = "";
    message.value = "";
    if(photo) photo.value = "";

  })
  .catch(err => {
    console.error(err);
    alert("❌ Server error while creating wish");
  })
  .finally(() => {
    if(window.createBtn) createBtn.disabled = false;
  });
}


// ✅ ✅ BEAUTIFUL MY WISHES CARD VIEW (TOKEN SAFE + ERROR SAFE)
function loadMyWishes(){

  const token = localStorage.getItem("token");
  if(!token){
    alert("❌ Login required to view your wishes");
    return;
  }

  fetch("/api/my-wishes", {
    headers:{
      "authorization": token
    }
  })
  .then(r => r.json())
  .then(data => {

    const box = document.getElementById("myWishes");
    if(!box) return;

    box.innerHTML = "";

    // ✅ NO AUTO SCROLL — AS YOU REQUESTED ✅

    if(!Array.isArray(data) || data.length === 0){
      box.innerHTML = "<p style='text-align:center;'>No wishes created yet 😢</p>";
      return;
    }

    data.forEach(w => {

      const div = document.createElement("div");
      div.className = "my-wish-card";

      const link = `/view.html?id=${w._id}&owner=1`;

      div.innerHTML = `
        ${w.photo ? `<img src="/uploads/${w.photo}" loading="lazy">` : ""}
        <h4>💖 ${w.from} → ${w.to}</h4>
        <p>${w.message}</p>
        <a href="${link}" class="open-btn" target="_blank">Open</a>
      `;

      box.appendChild(div);
    });

  })
  .catch(err => {
    console.error(err);
    alert("❌ Failed to load your wishes");
  });
}
