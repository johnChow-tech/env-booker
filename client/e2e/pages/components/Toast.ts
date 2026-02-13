import { expect, Page } from '@playwright/test';

/**
 * 📝 Architecture Note (设计笔记):
 *
 * Q: 为什么 Toast 被设计为 Page 的属性 (this.toast)，而不是像 Row 那样的方法 (getRow)?
 *
 * 1. 底层逻辑 (Ant Design Internals):
 * Toast (AntD Message) 的本质是 Client 端的一个 **全局单例 (Global Singleton)**。
 * 它的容器 (.ant-message) 就像一个永远存在的“公告栏”，伴随 Client 的生命周期而存在。
 * 即使没有业务数据 (No DB Data)，这个“公告栏”设施依然存在于 DOM 中。
 *
 * 2. 核心区别 (Capability vs Data):
 * - Toast 代表 **Client Capability (客户端能力)**：它是页面自带的基础设施，是固定的。
 * -> 对应 POM 模式：组合 (Composition)，在构造函数中初始化一次即可复用。
 * - Row 代表 **Business Data (业务数据)**：它是动态的，依赖于 DB 记录。
 * -> 对应 POM 模式：工厂 (Factory)，需要根据 ID/Name 动态查找。
 *
 * 3. 使用心智 (Usage Mental Model):
 * 用户是在使用页面的“通知服务”来验证流过的信息。
 * Code: await page.toast.verify('Success'); // "Use the toast service to verify..."
 */

export class Toast {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }
  /*
    get 是 JavaScript/TypeScript 中的一个关键字，用来定义 Getter（访问器）。
    简单一句话总结：它让一个“函数”，伪装成一个“属性”来使用。
    */
  private get container() {
    return this.page.locator('.ant-message');
  }

  async vertify(message: string) {
    const toast = this.container.locator('.ant-message-notice-content').filter({ hasText: message });
    await expect(toast).toBeVisible();
  }

  async waitForHidden() {
    await expect(this.container.locator('.ant-message-notice')).toHaveCount(0);
  }
}
