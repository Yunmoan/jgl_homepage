<template>
  <div id="historys" class="about-view page-wrapper">
    <div class="container">
      <h2 class="page-title">关于我们</h2>
      <div class="content">
        <h1><i>河北东方高校联合</i><span style="font-size: medium;">（Hebei Ccolleges and Universities TouHou Club
            Union），官方简称为</span> 冀高联。</h1>
        <p>河北东方高校联合是一个旨在服务于学生同好的公益性组织~</p>
        <p>我们的宗旨是：</p>
        <ul>
          <li>在河北地区推广优秀的东方Project文化。</li>
          <li>为省内的东方爱好者提供一个友好、开放的交流平台。</li>
          <li>组织线上线下的同好交流活动、二次创作分享会等。</li>
          <li>集结同好力量，进行东方Project相关的二次创作活动。</li>
        </ul>
        <p>无论你是刚刚接触东方的新朋友，还是资深的“老资历”，我们都热烈欢迎你的加入！</p>
        <a href="/fames#historys" class="action-link">高联组成</a>
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

.action-link {
  display: inline-block;
  font-size: .9rem;
  background-color: rgba(231, 163, 62, 0.76);
  /* Gold color from header */
  color: #fff;
  padding: 0.5rem 1.3rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.3s, transform 0.3s;
}

.action-link:hover {
  background-color: rgba(231, 163, 62, 0.6);
}

.action-link::after {
  content: ' →';
  /* Simple arrow icon */
  margin-left: 0.5rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: .3rem;
  text-align: left;
  border-bottom: 2px solid #763e47;
  padding-bottom: 0.3rem;
}

.content {
  padding-top: -1rem !important;

  padding: 1.5rem;
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
