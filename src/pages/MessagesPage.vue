<template>
  <div class="messages-page">
    <section class="hero">
      <div class="hero-content">
        <h1 class="main-title">高联留言板</h1>
        <p class="description">在这里写下你的想法，一起与同好们交流！</p>
        <button @click="showModal = true" class="open-modal-button">发表留言</button>
      </div>
    </section>

    <div class="main-sections">
      <TransitionGroup name="list" tag="div" class="messages-grid">
        <div v-if="messages.length === 0 && isMounted" class="no-messages" key="no-messages">暂无留言</div>
        <div v-for="(message, index) in reversedMessages" :key="message.id" class="message-card"
          :style="{ transitionDelay: `${index * 50}ms` }" :class="{ 'has-duplicates': message.duplicateCount > 1 }">
          <div class="message-header">
            <div class="author-section">
              <span class="author">{{ message.author }}</span>
              <span v-if="message.duplicateCount > 1" class="duplicate-badge">
                +{{ message.duplicateCount - 1 }}
              </span>
            </div>
            <span class="timestamp">{{ new Date(message.created_at).toLocaleDateString() }}</span>
          </div>
          <p class="message-body">{{ message.content }}</p>
        </div>
      </TransitionGroup>
    </div>

    <!-- Submission Modal -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <button @click="closeModal" class="close-button">&times;</button>
          <h2 class="sub-title">发表你的留言</h2>
          <form @submit.prevent="submitMessage">
            <div class="form-group">
              <label for="author">你的名字</label>
              <input type="text" id="author" v-model="newAuthor" placeholder="幻想乡的过客" required />
            </div>
            <div class="form-group">
              <label for="qq">QQ号</label>
              <input type="text" id="qq" v-model="newQQid" placeholder="选填，方便交流" />
            </div>
            <div class="form-group">
              <label for="content">留言内容</label>
              <textarea id="content" v-model="newContent" placeholder="在这里输入你的留言..." rows="4" required></textarea>
            </div>

            <div class="captcha-info">
              * 您的留言将在人工审核通过后予以展示。
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeModal" class="cancel-button">取消</button>
              <button type="submit" class="submit-button" :disabled="isSubmitting">
                <span v-if="isSubmitting">提交中...</span>
                <span v-else>提交</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useReCaptcha } from 'vue-recaptcha-v3'

interface Message {
  id: number;
  author: string;
  content: string;
  created_at: string; // Add created_at for timestamp
  qq?: string; // Optional QQ field
  duplicateCount?: number; // Track duplicate count
}

interface DeduplicatedMessage extends Message {
  duplicateCount: number;
}

const messages = ref<Message[]>([]);
const newAuthor = ref('');
const newContent = ref('');
const newQQid = ref(''); // Define newQQid
const showModal = ref(false)
const isMounted = ref(false)
const isSubmitting = ref(false)

const recaptcha = useReCaptcha()

const closeModal = () => {
  showModal.value = false
}

const fetchMessages = async () => {
  try {
    const response = await fetch('/api/messages');
    if (!response.ok) throw new Error('Network response was not ok');
    messages.value = await response.json();
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
};

onMounted(() => {
  fetchMessages();
  isMounted.value = true;
});

// 计算相似度（用于检测重复内容）
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

// 编辑距离算法（Levenshtein distance）
const getEditDistance = (s1: string, s2: string): number => {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue: number = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        // Ensure previous value is a number
        let newValue: number = costs[j - 1] ?? (j - 1);
        const cj = costs[j] ?? Number.POSITIVE_INFINITY;
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), cj) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      } else {
        // j === 0 and i > 0
        costs[0] = i;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length] ?? 0;
};

// 去重和聚合留言
const deduplicateMessages = (msgs: Message[]): DeduplicatedMessage[] => {
  const seen = new Map<string, DeduplicatedMessage>();
  const threshold = 0.85; // 相似度阈值（85%以上认为是重复）

  msgs.forEach((msg) => {
    let found = false;

    // 检查是否与已有的留言相似
    for (const [key, existingMsg] of seen.entries()) {
      const similarity = calculateSimilarity(msg.content, existingMsg.content);

      if (similarity >= threshold) {
        // 如果相似度高，增加重复计数
        existingMsg.duplicateCount++;
        found = true;
        break;
      }
    }

    // 如果没有找到相似的留言，添加新留言
    if (!found) {
      const key = `${msg.content}`;
      seen.set(key, {
        ...msg,
        duplicateCount: 1
      });
    }
  });

  return Array.from(seen.values());
};

const reversedMessages = computed(() => {
  const deduped = deduplicateMessages([...messages.value]);
  return deduped.reverse();
})

const submitMessage = async () => {
  if (!newAuthor.value.trim() || !newContent.value.trim() || isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  try {
    if (!recaptcha) {
      alert('reCAPTCHA 未初始化，请稍后重试。');
      isSubmitting.value = false;
      return;
    }
    await recaptcha.recaptchaLoaded();
    const token = await recaptcha.executeRecaptcha('submit_message');

    if (!token) {
      alert('人机验证失败，请稍后重试。');
      isSubmitting.value = false;
      return;
    }

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        author: newAuthor.value,
        content: newContent.value,
        qq: newQQid.value,
        token: token,
      }),
    });

    const contentType = response.headers.get('content-type') || ''
    let data: any = null
    try {
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        try { data = JSON.parse(text) } catch { data = { raw: text } }
      }
    } catch (_) {
      // ignore parse error
    }

    if (!response.ok) {
      const codes: string[] = Array.isArray(data?.errorCodes) ? data.errorCodes : []
      let msg = data?.error || data?.message || ''
      if (!msg && codes.includes('invalid-input-response')) {
        msg = 'reCAPTCHA 响应无效，请刷新页面后重试。'
      }
      const extras: string[] = []
      if (codes.length) extras.push(`错误码：${codes.join(', ')}`)
      if (typeof data?.score === 'number') extras.push(`评分：${data.score}`)
      if (data?.action) extras.push(`action：${data.action}`)
      const detail = extras.length ? `（${extras.join('；')}）` : ''
      throw new Error(msg ? `${msg}${detail}` : `提交失败（HTTP ${response.status}）`)
    }

    alert('留言提交成功！感谢您的留言，审核通过后将会显示。');

    newAuthor.value = '';
    newContent.value = '';
    newQQid.value = '';
    closeModal();

  } catch (error: any) {
    console.error('Submission error:', error);
    alert(error?.message || '提交时发生错误，请检查网络连接或稍后重试。');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.hero {
  height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: left;
  padding: 0 6rem;
  gap: 3rem;
  position: relative;
  background: linear-gradient(rgba(28, 25, 70, 0.3), rgba(125, 29, 74, 0.269)), url('/134678540_p1.webp') no-repeat center bottom/cover;
  background-attachment: fixed;
}

.main-sections {
  background: linear-gradient(#5493ae, #263d6a);
  padding: 4rem 2rem;
}

.hero-content {
  flex: 1;
}

.main-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: #fff;
  margin-top: 100px;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(130, 81, 0, 0.6);
}

.description {
  font-size: 1.1rem;
  color: #cbd5e1;
  max-width: 100%;
  margin: 1rem 0 2rem;
}

@media (max-width: 868px) {
  .hero {
    padding: 8rem 2rem 0;
    align-items: flex-start;
    justify-content: flex-start;
  }

  .hero-content {
    text-align: left;
  }
}

.open-modal-button {
  margin-top: 2rem;
  padding: 12px 24px;
  font-size: 1.1rem;
  font-weight: bold;
  color: #1a202c;
  background-color: #63b3ed;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(99, 179, 237, 0.2);
}

.open-modal-button:hover {
  background-color: #4299e1;
  /* transform: translateY(-2px); */
  box-shadow: 0 6px 20px rgba(99, 179, 237, 0.3);
}

/* Messages Grid */
.messages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.no-messages {
  grid-column: 1 / -1;
  text-align: center;
  color: #a0aec0;
  padding: 4rem;
}

.message-card {
  background: linear-gradient(145deg, #2d3748, #1a202c);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid #4a5568;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.message-card:hover {
  /* transform: translateY(-5px); */
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid #4a5568;
  padding-bottom: 0.5rem;
}

.author-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.author {
  font-weight: bold;
  color: #63b3ed;
}

.duplicate-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #ed8936;
  color: #fff;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
}

.timestamp {
  font-size: 0.8rem;
  color: #a0aec0;
}

.message-card.has-duplicates {
  border-left: 3px solid #ed8936;
}

.message-body {
  color: #e2e8f0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  background: #2d3748;
  padding: 2.5rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  border: 1px solid #4a5568;
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.3s ease;
}

.close-button:hover {
  color: #fff;
}

.sub-title {
  font-size: 1.8rem;
  color: #cbd5e1;
  margin-bottom: 2rem;
  text-align: center;
}

.form-group {
  margin-left: -1.3rem;
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #cbd5e1;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.8rem;
  border-radius: 4px;
  border: 1px solid #4a5568;
  background-color: #1a202c;
  color: #e2e8f0;
  font-size: 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #63b3ed;
  box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.3);
}

.captcha-info {
  font-size: 0.8rem;
  color: #a0aec0;
  text-align: left;
  margin: 2rem 0;
}

.captcha-info a {
  color: #63b3ed;
  text-decoration: none;
}

.captcha-info a:hover {
  text-decoration: underline;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-button,
.submit-button {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-button {
  background-color: #4a5568;
  color: #e2e8f0;
}

.cancel-button:hover {
  background-color: #718096;
}

.submit-button {
  background-color: #63b3ed;
  color: #1a202c;
}

.submit-button:hover {
  background-color: #4299e1;
  /* transform: translateY(-2px); */
}

.submit-button:disabled {
  background-color: #4a5568;
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

.list-enter-active {
  transition: all 0.5s ease;
}

.list-enter-from {
  opacity: 0;
  /* transform: translateY(30px); */
}
</style>
