document.addEventListener('DOMContentLoaded', function(){
  var projectModal = document.getElementById('projectModal')
  projectModal.addEventListener('show.bs.modal', function (event) {
    var button = event.relatedTarget
    var title = button.getAttribute('data-title')
    var img = button.getAttribute('data-img')
    projectModal.querySelector('#projectTitle').textContent = title
    projectModal.querySelector('#projectImg').src = img
  })

  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var target = document.querySelector(this.getAttribute('href'));
      if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth', block:'start'}); }
    })
  });

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(ent){
      if(ent.isIntersecting){ ent.target.classList.add('visible'); io.unobserve(ent.target); }
    });
  },{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(function(r){ io.observe(r); });

  var pb = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        var bars = e.target.querySelectorAll('.progress-bar');
        bars.forEach(function(b){ b.style.width = b.getAttribute('aria-valuenow') + '%'; });
        pb.unobserve(e.target);
      }
    })
  },{threshold:0.25});
  var skillCard = document.querySelector('#capabilities .card');
  if(skillCard) pb.observe(skillCard);

  var sendBtn = document.getElementById('sendBtn');
  if(sendBtn){
    sendBtn.addEventListener('click', function(){
      var name = document.getElementById('name').value.trim();
      var email = document.getElementById('email').value.trim();
      var msg = document.getElementById('msg').value.trim();
      var alertBox = document.getElementById('formAlert');
      if(!name || !email){
        alertBox.style.display='block'; alertBox.className='alert alert-danger mt-2'; alertBox.textContent='Please enter name and email.'; return;
      }
      alertBox.style.display='block'; alertBox.className='alert alert-success mt-2'; alertBox.textContent='Thanks! We will reach out soon.';
      document.getElementById('name').value='';document.getElementById('email').value='';document.getElementById('msg').value='';
    })
  }
});
