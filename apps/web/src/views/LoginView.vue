<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-vue-next';
import BrandMark from '../components/BrandMark.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const login = ref('demo@tms.local');
const password = ref('demo123');
const remember = ref(true);
const showPassword = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  try {
    await auth.login(login.value, password.value, remember.value);
    await router.push(String(route.query.redirect ?? '/dashboard'));
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to sign in.';
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-story">
      <div class="story-glow story-glow-one"></div>
      <div class="story-glow story-glow-two"></div>
      <BrandMark inverse />
      <div class="story-copy">
        <span class="eyebrow"><span></span> Built for construction teams</span>
        <h1>Every project.<br /><em>One clear view.</em></h1>
        <p>Keep sites, spending, materials, and teams connected—from tender preparation to final handover.</p>
        <div class="story-points">
          <div><CheckCircle2 :size="19" /><span><strong>Control project costs</strong><small>Separate pre-award and execution spending.</small></span></div>
          <div><CheckCircle2 :size="19" /><span><strong>Work across every site</strong><small>Track 93 active locations from one workspace.</small></span></div>
          <div><CheckCircle2 :size="19" /><span><strong>Give the right access</strong><small>Role and project-based permissions for every user.</small></span></div>
        </div>
      </div>
      <footer>© 2026 TMS <span></span> Secure project operations</footer>
    </section>

    <section class="login-form-side">
      <div class="mobile-brand"><BrandMark /></div>
      <div class="login-card">
        <div class="login-intro">
          <span class="secure-pill"><LockKeyhole :size="13" /> Secure workspace</span>
          <h2>Welcome back</h2>
          <p>Sign in to continue to your project workspace.</p>
        </div>
        <form @submit.prevent="submit">
          <label class="field-label" for="login">Email or username</label>
          <div class="input-wrap" :class="{ invalid: error }">
            <Mail :size="18" />
            <input id="login" v-model="login" autocomplete="username" placeholder="you@company.com" required />
          </div>
          <div class="password-label">
            <label class="field-label" for="password">Password</label>
            <button type="button">Forgot password?</button>
          </div>
          <div class="input-wrap" :class="{ invalid: error }">
            <LockKeyhole :size="18" />
            <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required />
            <button type="button" class="show-password" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
              <EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" />
            </button>
          </div>
          <label class="remember"><input v-model="remember" type="checkbox" /><span></span>Keep me signed in</label>
          <p v-if="error" class="form-error">{{ error }}</p>
          <button class="primary-button login-submit" :disabled="auth.loading">
            <span>{{ auth.loading ? 'Signing in…' : 'Sign in to workspace' }}</span><ArrowRight v-if="!auth.loading" :size="18" />
          </button>
        </form>
        <div class="demo-note"><span>Preview access</span><code>demo@tms.local</code><i>·</i><code>demo123</code></div>
        <p class="login-support">Having trouble? <a href="mailto:support@tms.local">Contact your administrator</a></p>
      </div>
    </section>
  </main>
</template>
