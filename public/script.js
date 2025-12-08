// ✅ REGISTER
function register(){
 fetch("/api/register",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
   name:rname.value,
   email:remail.value,
   password:rpassword.value
  })
 }).then(r=>r.json()).then(d=>{
   if(d.success) alert("Registered Successfully");
   else alert(d.error);
 });
}

// ✅ LOGIN
function login(){
 fetch("/api/login",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
   email:lemail.value,
   password:lpassword.value
  })
 }).then(r=>r.json()).then(d=>{
   if(d.token){
     localStorage.setItem("token",d.token);
     location.href="dashboard.html";
   }else alert("Invalid Login");
 });
}

// ✅ CREATE WISH (TOKEN SAFE + OWNER LINK)
function createWish(){
 const fd = new FormData();
 fd.append("from",from.value);
 fd.append("to",to.value);
 fd.append("message",message.value);
 fd.append("photo",photo.files[0]);

 fetch("/api/wish",{
  method:"POST",
  headers:{ 
    "authorization": localStorage.getItem("token")   // ✅ TOKEN SAFE
  },
  body:fd
 }).then(r=>r.json()).then(d=>{

   // ✅ CREATOR ke liye special owner link
   const ownerLink = d.link + "&owner=1";

   result.innerHTML = `
     ✅ <a href="${ownerLink}">Open Your Wish</a>
     <br><small>(Only you will see WhatsApp share button)</small>
   `;
 });
}