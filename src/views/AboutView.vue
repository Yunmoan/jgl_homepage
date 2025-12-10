<template>
  <div class="about-view page-wrapper">
    <div class="container">
      <h2 class="page-title">关于我们 / ABOUT US</h2>
      <div class="content">
        <p>河北东方高校联合是一个旨在服务于学生同好的公益性组织~</p>
        <p>我们的宗旨是：</p>
        <ul>
          <li>在河北地区推广优秀的东方Project文化。</li>
          <li>为省内的东方爱好者提供一个友好、开放的交流平台。</li>
          <li>组织线上线下的同好交流活动、二次创作分享会等。</li>
          <li>集结同好力量，进行东方Project相关的二次创作活动。</li>
        </ul>
        <p>无论你是刚刚接触东方的新朋友，还是资深的“老船员”，我们都热烈欢迎你的加入！</p>
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
  font-size: 1.1rem;
  line-height: 1.8;
}

.content p {
  margin-bottom: 1.5rem;
}

.content ul {
  list-style-type: '✨ ';
  padding-left: 2rem;
}

.content li {
  margin-bottom: 1rem;
}
</style>
