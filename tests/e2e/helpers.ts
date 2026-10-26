// E2E 交互 helper —— antd 组件的可靠点击模式
// 设计原因：screen.getByRole('option') 会触发 Select onBlur 关闭下拉；
// getByLabel('xx') 对 antd Select 命中的是 label 文本节点，点击无法打开下拉。
// 故统一用 browser.locator CSS 连续点击（开下拉→选可见 option）。
import type { Browser } from '@e2e-dev/web';

/** 打开 antd Select 下拉并选中可见的 option（按 title 属性匹配） */
export async function pickAntdSelect(
  browser: Browser,
  triggerScope: string,
  optionTitle: string,
): Promise<void> {
  await browser.locator(`${triggerScope} .ant-select-selector`).first().click();
  await browser
    .locator(
      `.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${optionTitle}"]`,
    )
    .first()
    .click();
}

/** 打开 antd 多选 Select 下拉并选中一个 option（不关闭下拉，适合逐个勾选） */
export async function pickAntdMultiOption(
  browser: Browser,
  triggerScope: string,
  optionTitle: string,
): Promise<void> {
  // 多选点击 option 不会自动关闭下拉
  await browser
    .locator(
      `.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${optionTitle}"]`,
    )
    .first()
    .click();
}

/** 先打开多选 Select 下拉（首次需点击 selector） */
export async function openAntdMultiSelect(browser: Browser, triggerScope: string): Promise<void> {
  await browser.locator(`${triggerScope} .ant-select-selector`).first().click();
}

/** 关闭已打开的 antd Select 下拉（点 Modal body 空白处） */
export async function closeAntdSelect(browser: Browser): Promise<void> {
  await browser.locator('.ant-modal-body').first().click({ position: { x: 8, y: 8 } }).catch(() => {});
}
