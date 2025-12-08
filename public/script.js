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
  const relation = document.getElementById("relation").value;
  const box = document.getElementById("wishList");
  box.innerHTML = "";

  if(!relation || !wishes[relation]) return;

  wishes[relation].forEach(text => {
    const btn = document.createElement("button");
    btn.innerText = text;
    btn.style.margin = "5px 0";
    btn.onclick = () => {
      document.getElementById("message").value = text;
    };
    box.appendChild(btn);
  });
}

// ✅ CREATE WISH (TOKEN SAFE + OWNER LINK)
function createWish(){
 const fd = new FormData();
 fd.append("from", from.value);
 fd.append("to", to.value);
 fd.append("message", message.value);
 fd.append("photo", photo?.files[0]);

 fetch("/api/wish",{
  method:"POST",
  headers:{ 
    "authorization": localStorage.getItem("token")
  },
  body:fd
 }).then(r=>r.json()).then(d=>{
   const ownerLink = d.link + "&owner=1";
   result.innerHTML = `✅ <a href='${ownerLink}'>Open Your Wish</a>`;
 });
}

// ✅ ✅ BEAUTIFUL MY WISHES CARD VIEW
function loadMyWishes(){
  fetch("/api/my-wishes", {
    headers:{
      "authorization": localStorage.getItem("token")
    }
  })
  .then(r => r.json())
  .then(data => {
    const box = document.getElementById("myWishes");
    box.innerHTML = "";

    if(data.length === 0){
      box.innerHTML = "<p style='text-align:center;'>No wishes created yet 😢</p>";
      return;
    }

    data.forEach(w => {
      const div = document.createElement("div");
      div.className = "my-wish-card";

      const link = `/view.html?id=${w._id}&owner=1`;

      div.innerHTML = `
        ${w.photo ? `<img src="/uploads/${w.photo}">` : ""}
        <h4>💖 ${w.from} → ${w.to}</h4>
        <p>${w.message}</p>
        <a href="${link}" class="open-btn">Open</a>
      `;

      box.appendChild(div);
    });
  });
}
