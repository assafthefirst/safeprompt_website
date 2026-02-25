/**
 * Minimal DOM fixtures for selector tests.
 * These are not meant to mirror full production DOMs; just enough to validate our heuristics.
 */

export const FIXTURES = {
  chatgpt: {
    loggedIn: `
      <div id="app">
        <div style="height:1200px"></div>
        <div id="composer" style="position:fixed;left:200px;bottom:10px;width:700px">
          <div id="prompt-textarea" contenteditable="true" role="textbox" style="width:700px;height:80px"></div>
          <button data-testid="send-button" aria-label="Send" style="width:40px;height:40px"></button>
        </div>
        <article class="markdown">assistant msg</article>
      </div>
    `,
    loggedOut: `
      <div id="landing">
        <a href="/auth/login">Log in</a>
      </div>
    `,
  },
  gemini: {
    loggedIn: `
      <div id="root">
        <div role="main">
          <div contenteditable="true" role="textbox" style="position:fixed;left:180px;bottom:12px;width:680px;height:72px"></div>
          <button aria-label="Send" type="submit" style="position:fixed;left:880px;bottom:12px;width:44px;height:44px"></button>
        </div>
        <div role="article" class="markdown">assistant</div>
      </div>
    `,
    loggedOut: `
      <div id="signin">
        <button>Sign in</button>
      </div>
    `,
  },
  claude: {
    loggedIn: `
      <div id="c">
        <div contenteditable="true" role="textbox" style="position:fixed;left:180px;bottom:12px;width:680px;height:72px"></div>
        <button aria-label="Send" type="submit" style="position:fixed;left:880px;bottom:12px;width:44px;height:44px"></button>
        <article class="prose">assistant</article>
      </div>
    `,
    loggedOut: `
      <div id="login">
        <a href="/login">Login</a>
      </div>
    `,
  },
  grok: {
    loggedIn: `
      <div id="g">
        <textarea style="position:fixed;left:160px;bottom:10px;width:700px;height:70px"></textarea>
        <button aria-label="Send" type="submit" style="position:fixed;left:880px;bottom:10px;width:44px;height:44px"></button>
        <div class="markdown">assistant</div>
      </div>
    `,
    loggedOut: `
      <div id="login">
        <button>Sign in</button>
      </div>
    `,
  },
  copilot: {
    loggedIn: `
      <div id="cp">
        <div contenteditable="true" role="textbox" style="position:fixed;left:160px;bottom:10px;width:700px;height:70px"></div>
        <button aria-label="Send" type="submit" style="position:fixed;left:880px;bottom:10px;width:44px;height:44px"></button>
        <div role="article" class="prose">assistant</div>
      </div>
    `,
    loggedOut: `
      <div id="login">
        <button>Sign in</button>
      </div>
    `,
  },
  deepseek: {
    loggedIn: `
      <div id="ds">
        <textarea style="position:fixed;left:160px;bottom:10px;width:700px;height:70px"></textarea>
        <button aria-label="Send" type="submit" style="position:fixed;left:880px;bottom:10px;width:44px;height:44px"></button>
        <article>assistant</article>
      </div>
    `,
    loggedOut: `
      <div id="login">
        <button>Login</button>
      </div>
    `,
  },
}

