<template>
  <div class="contact-view page-wrapper">
    <div class="container">
      <h2 class="page-title">加入我们 / JOIN US！</h2>
      <p style="text-align: center;padding-bottom: 1.5rem;">无论你是东方Project的老玩家，还是刚刚了解幻想乡的新人， 我们都欢迎你的加入！一起探索这个奇妙的弹幕世界吧！
      </p>
      <div class="content">
        <img width="256" height="256" style="text-align: center;" src="/qq_qrcode.webp" />
        <br /><span>扫描二维码加入河北高校东方联合会</span>

        <!-- <ul>
          <li><strong>社团交流QQ群:</strong> <a href="#">123456789</a> (点击加群)</li>
          <li><strong>电子邮件:</strong> <a href="mailto:contact@hebei-touhou.com">contact@hebei-touhou.com</a></li>
          <li><strong>Bilibili官方账号:</strong> <a href="#" target="_blank" rel="noopener">@河北东方高校联合会</a></li>
        </ul>
        <p>我们期待你的声音！</p> -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.page-wrapper {
  padding: 120px 0 5rem;
  /* 80px for header + 40px top padding */
  background: linear-gradient(#235b72, #353535)
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: .1rem;
  text-align: center;
  /* border-bottom: 2px solid #5698c3; */
  padding-bottom: .2rem;
}

.content {
  background-color: rgba(58, 103, 239, 0.411);
  padding: 2.5rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 300px;
  margin: 0 auto;
}

.content ul {
  list-style: none;
  padding: 0;
}

.content li {
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
}

.content a {
  color: #5698c3;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s;
}

.content a:hover {
  color: #825100;
  /* New dark gold for hover */
}
</style>
