<template>
  <div class="contact-view page-wrapper">
    <div class="container">
      <h2 class="page-title">联系我们 / CONTACT</h2>
      <div class="content">
        <p>我们非常欢迎新的伙伴加入，或是与其他组织进行交流合作。你可以通过以下方式联系到我们：</p>
        <ul>
          <li><strong>社团交流QQ群:</strong> <a href="#">123456789</a> (点击加群)</li>
          <li><strong>电子邮件:</strong> <a href="mailto:contact@hebei-touhou.com">contact@hebei-touhou.com</a></li>
          <li><strong>Bilibili官方账号:</strong> <a href="#" target="_blank" rel="noopener">@河北东方高校联合</a></li>
        </ul>
        <p>我们期待你的声音！</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.page-wrapper {
  padding: 120px 0 4rem;
  /* 80px for header + 40px top padding */
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 3rem;
  text-align: left;
  border-bottom: 2px solid #5698c3;
  padding-bottom: 1rem;
}

.content {
  background-color: rgba(26, 75, 139, 0.2);
  padding: 2.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 800px;
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
