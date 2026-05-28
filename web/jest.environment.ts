/**
 * Custom jest test environment that extends jsdom and injects Node 18+
 * built-in Web Fetch API globals (Response, Request, Headers) that jsdom
 * does not include by default.
 */
import JSDOMEnvironment from 'jest-environment-jsdom';

export default class CustomJSDOMEnvironment extends JSDOMEnvironment {
  override async setup(): Promise<void> {
    await super.setup();

    // Copy Node 18+ built-in Web Fetch API constructors into the jsdom global
    if (typeof globalThis.Response !== 'undefined') {
      this.global.Response = globalThis.Response;
    }
    if (typeof globalThis.Request !== 'undefined') {
      this.global.Request = globalThis.Request;
    }
    if (typeof globalThis.Headers !== 'undefined') {
      this.global.Headers = globalThis.Headers;
    }
  }
}
