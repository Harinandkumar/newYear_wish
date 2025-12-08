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

function createWish(){
 const fd=new FormData();
 fd.append("from",from.value);
 fd.append("to",to.value);
 fd.append("message",message.value);
 fd.append("photo",photo.files[0]);

 fetch("/api/wish",{
  method:"POST",
  headers:{ "authorization": localStorage.getItem("token") },
  body:fd
 }).then(r=>r.json()).then(d=>{
   result.innerHTML=`✅ <a href='${d.link}'>Open Wish</a>`;
 });
}
