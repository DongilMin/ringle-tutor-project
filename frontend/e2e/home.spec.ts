import { test, expect } from '@playwright/test';

test.describe('홈페이지', () => {
  test('페이지 로드 및 기본 요소 확인', async ({ page }) => {
    await page.goto('/');

    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/Ringle/i);

    // 메인 헤딩 확인
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 멤버십 관련 요소 확인
    await expect(page.getByText(/멤버십|Membership/i)).toBeVisible();
  });

  test('네비게이션 링크 동작 확인', async ({ page }) => {
    await page.goto('/');

    // 대화하기 버튼이 있으면 클릭
    const conversationLink = page.getByRole('link', { name: /대화|Conversation/i });
    if (await conversationLink.isVisible()) {
      await conversationLink.click();
      await expect(page).toHaveURL(/conversation/);
    }
  });

  test('구매 페이지로 이동', async ({ page }) => {
    await page.goto('/');

    // 구매 관련 버튼 찾기
    const purchaseButton = page.getByRole('link', { name: /구매|Purchase|시작/i });
    if (await purchaseButton.isVisible()) {
      await purchaseButton.click();
      await expect(page).toHaveURL(/purchase/);
    }
  });

  test('콘솔 에러 없음 확인', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // React 개발 모드 경고는 허용
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('React') && !err.includes('DevTools')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
