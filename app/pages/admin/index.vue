<script setup lang="ts">
import {useAdminAuth} from "~/composables/admin/useAdminAuth.ts";
import {useAdminDiagnostics} from "~/composables/admin/useAdminDiagnostics.ts";

const { token, login, logout } = useAdminAuth()
const { diagnostics, pending, error: diagnosticsError, refresh } = useAdminDiagnostics()

const loginValue = ref('')
const passwordValue = ref('')
const loginPending = ref(false)
const loginError = ref<string | null>(null)

watch(
    token,
    value => {
      if (value) {
        void refresh()
      }
    },
    {
      immediate: true,
    },
)

async function submitLogin() {
  if (loginPending.value) {
    return
  }

  loginPending.value = true
  loginError.value = null

  try {
    await login(loginValue.value, passwordValue.value)
    passwordValue.value = ''
  } catch (reason) {
    loginError.value = loginErrorMessage(reason)
  } finally {
    loginPending.value = false
  }
}

async function submitLogout() {
  await logout()
  diagnostics.value = null
}

function loginErrorMessage(reason: unknown) {
  if (responseStatus(reason) === 401) {
    return 'Неверный логин или пароль.'
  }

  if (responseStatus(reason) === 422) {
    return 'Заполните логин и пароль.'
  }

  return reason instanceof Error ? reason.message : 'Не удалось выполнить вход.'
}

function responseStatus(reason: unknown) {
  if (!reason || typeof reason !== 'object') {
    return null
  }

  const response = 'response' in reason ? reason.response : null
  if (!response || typeof response !== 'object') {
    return null
  }

  return 'status' in response && typeof response.status === 'number'
      ? response.status
      : null
}
</script>

<template>
  <main class="admin-page">
    <section v-if="!token" class="login-card">
      <p class="eyebrow">FPR Admin</p>
      <h1>Вход</h1>
      <p class="login-description">Управление данными и диагностика backend.</p>

      <form @submit.prevent="submitLogin">
        <label>
          <span>Логин</span>
          <input
              v-model="loginValue"
              type="text"
              autocomplete="username"
              required
              autofocus
          >
        </label>

        <label>
          <span>Пароль</span>
          <input
              v-model="passwordValue"
              type="password"
              autocomplete="current-password"
              required
          >
        </label>

        <p v-if="loginError" class="form-error">{{ loginError }}</p>

        <button type="submit" :disabled="loginPending">
          {{ loginPending ? 'Входим…' : 'Войти' }}
        </button>
      </form>
    </section>

    <template v-else>
      <header class="admin-header">
        <div>
          <p class="eyebrow">FPR Admin</p>
          <h1>Диагностика</h1>
        </div>

        <div class="header-actions">
          <a href="/">На сайт</a>
          <button type="button" @click="submitLogout">Выйти</button>
        </div>
      </header>

      <section class="summary-grid">
        <article>
          <span>Всего</span>
          <strong>{{ diagnostics?.total ?? '—' }}</strong>
        </article>
        <article>
          <span>Ошибки</span>
          <strong>{{ diagnostics?.errors ?? '—' }}</strong>
        </article>
        <article>
          <span>Предупреждения</span>
          <strong>{{ diagnostics?.warnings ?? '—' }}</strong>
        </article>
      </section>

      <div v-if="diagnosticsError" class="notice notice-error">
        <span>{{ diagnosticsError }}</span>
        <button type="button" :disabled="pending" @click="refresh">Повторить</button>
      </div>

      <div v-else-if="pending && !diagnostics" class="notice">
        Загружаем диагностику…
      </div>

      <section v-else-if="diagnostics" class="issues">
        <div class="section-heading">
          <h2>Активные проблемы</h2>
          <button type="button" :disabled="pending" @click="refresh">
            {{ pending ? 'Обновляем…' : 'Обновить' }}
          </button>
        </div>

        <p v-if="diagnostics.items.length === 0" class="empty-state">
          Активных проблем нет.
        </p>

        <template v-else>
          <article
              v-for="issue in diagnostics.items"
              :key="issue.key"
              class="issue"
              :class="`issue-${issue.severity}`"
          >
            <div class="issue-heading">
              <strong>{{ issue.message }}</strong>
              <span>{{ issue.severity === 'error' ? 'Ошибка' : 'Предупреждение' }}</span>
            </div>

            <dl>
              <div>
                <dt>Источник</dt>
                <dd>{{ issue.source }}</dd>
              </div>
              <div>
                <dt>Тип</dt>
                <dd>{{ issue.type }}</dd>
              </div>
              <div v-if="issue.instrument_id !== null">
                <dt>Instrument ID</dt>
                <dd>{{ issue.instrument_id }}</dd>
              </div>
            </dl>

            <details v-if="Object.keys(issue.details).length">
              <summary>Детали</summary>
              <pre>{{ JSON.stringify(issue.details, null, 2) }}</pre>
            </details>
          </article>
        </template>
      </section>
    </template>
  </main>
</template>

<style scoped>
.admin-page {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
  padding: 48px 0 72px;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: 2rem;
  letter-spacing: -.035em;
}

h2 {
  margin-bottom: 0;
  font-size: 1.15rem;
}

.eyebrow {
  margin-bottom: 7px;
  color: #697386;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.login-card {
  width: min(100%, 380px);
  margin: 12vh auto 0;
  padding: 24px;
  border: 1px solid #e0e4ea;
  border-radius: 14px;
  background: #fff;
}

.login-description {
  margin-bottom: 24px;
  color: #697386;
  font-size: .88rem;
}

form,
label {
  display: grid;
}

form {
  gap: 15px;
}

label {
  gap: 6px;
}

label span {
  color: #596273;
  font-size: .8rem;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 10px 11px;
  border: 1px solid #cbd2dc;
  border-radius: 8px;
  background: #fff;
}

button {
  padding: 8px 11px;
  border: 1px solid #cbd2dc;
  border-radius: 8px;
  color: #273244;
  background: #fff;
  cursor: pointer;
}

form button {
  margin-top: 3px;
  border-color: #273244;
  color: #fff;
  background: #273244;
}

button:disabled {
  cursor: default;
  opacity: .55;
}

.form-error {
  margin-bottom: 0;
  color: #9a3434;
  font-size: .8rem;
}

.admin-header,
.header-actions,
.section-heading,
.issue-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-header {
  gap: 24px;
  margin-bottom: 24px;
}

.header-actions {
  gap: 9px;
}

.header-actions a {
  padding: 8px 11px;
  color: #4b5565;
  font-size: .82rem;
  text-decoration: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 24px;
}

.summary-grid article {
  padding: 16px;
  border: 1px solid #e0e4ea;
  border-radius: 11px;
  background: #fff;
}

.summary-grid span {
  display: block;
  color: #70798a;
  font-size: .78rem;
}

.summary-grid strong {
  display: block;
  margin-top: 5px;
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
}

.notice {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid #dce1e8;
  border-radius: 10px;
  background: #fff;
}

.notice-error {
  border-color: #e2b9b9;
  color: #8d2d2d;
}

.issues {
  display: grid;
  gap: 10px;
}

.section-heading {
  gap: 16px;
  margin-bottom: 4px;
}

.empty-state {
  margin-bottom: 0;
  padding: 32px 16px;
  border: 1px solid #dfe8df;
  border-radius: 11px;
  color: #4d6a4d;
  background: #fbfdfb;
  text-align: center;
}

.issue {
  padding: 15px 16px;
  border: 1px solid #e0e4ea;
  border-left-width: 4px;
  border-radius: 10px;
  background: #fff;
}

.issue-error {
  border-left-color: #b24747;
}

.issue-warning {
  border-left-color: #c08a29;
}

.issue-heading {
  gap: 16px;
  align-items: flex-start;
}

.issue-heading span {
  color: #70798a;
  font-size: .72rem;
  white-space: nowrap;
}

dl {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 24px;
  margin: 12px 0 0;
}

dl div {
  display: flex;
  gap: 6px;
}

dt,
dd {
  margin: 0;
  font-size: .76rem;
}

dt {
  color: #7a8392;
}

dd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

details {
  margin-top: 12px;
}

summary {
  color: #596273;
  cursor: pointer;
  font-size: .78rem;
}

pre {
  max-width: 100%;
  margin: 8px 0 0;
  padding: 10px;
  overflow: auto;
  border-radius: 7px;
  background: #f7f8fa;
  font-size: .72rem;
}

@media (max-width: 620px) {
  .admin-page {
    width: min(100% - 24px, 960px);
    padding-top: 28px;
  }

  .admin-header {
    align-items: flex-start;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
