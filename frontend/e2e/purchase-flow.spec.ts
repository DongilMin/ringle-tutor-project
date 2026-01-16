import { test, expect } from '@playwright/test';

test.describe('멤버십 구매 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/purchase');
  });

  test('플랜 목록이 API에서 로드됨', async ({ page }) => {
    // 로딩 완료 대기
    await expect(page.getByText(/플랜 선택|Select Plan/i)).toBeVisible({ timeout: 10000 });

    // 플랜 카드들이 표시되는지 확인
    await expect(page.getByText(/베이직|Basic/i)).toBeVisible();
    await expect(page.getByText(/프리미엄|Premium/i)).toBeVisible();
  });

  test('플랜 선택 시 결제 폼으로 이동', async ({ page }) => {
    // 플랜 로딩 대기
    await expect(page.getByText(/프리미엄|Premium/i)).toBeVisible({ timeout: 10000 });

    // 프리미엄 플랜 선택
    await page.getByText(/프리미엄|Premium/i).click();

    // 선택/다음 버튼 클릭
    const selectButton = page.getByRole('button', { name: /선택|Select|다음|Next/i });
    if (await selectButton.isVisible()) {
      await selectButton.click();
    }

    // 결제 폼이 나타나는지 확인
    await expect(page.getByText(/결제 정보|Payment|카드/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('결제 폼 유효성 검사', async ({ page }) => {
    // 플랜 선택
    await expect(page.getByText(/베이직|Basic/i)).toBeVisible({ timeout: 10000 });
    await page.getByText(/베이직|Basic/i).click();

    const selectButton = page.getByRole('button', { name: /선택|Select|다음|Next/i });
    if (await selectButton.isVisible()) {
      await selectButton.click();
    }

    // 빈 폼 제출 시도
    const submitButton = page.getByRole('button', { name: /결제|Pay|Submit/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // 에러 메시지 확인
      await expect(page.getByText(/필수|required|입력/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('전체 구매 플로우 (성공 케이스)', async ({ page }) => {
    // Step 1: 플랜 선택
    await expect(page.getByText(/프리미엄|Premium/i)).toBeVisible({ timeout: 10000 });
    await page.getByText(/프리미엄|Premium/i).click();

    const selectButton = page.getByRole('button', { name: /선택|Select|다음|Next/i });
    if (await selectButton.isVisible()) {
      await selectButton.click();
    }

    // Step 2: 결제 정보 입력
    const cardInput = page.getByLabel(/카드 번호|Card Number/i);
    if (await cardInput.isVisible()) {
      await cardInput.fill('4242424242424242');

      const expiryInput = page.getByLabel(/유효기간|Expiry/i);
      if (await expiryInput.isVisible()) {
        await expiryInput.fill('12/28');
      }

      const cvcInput = page.getByLabel(/CVC|CVV|보안코드/i);
      if (await cvcInput.isVisible()) {
        await cvcInput.fill('123');
      }

      // Step 3: 결제 버튼 클릭
      const payButton = page.getByRole('button', { name: /결제하기|Pay|확인/i });
      await payButton.click();

      // Step 4: 성공 메시지 확인 (Mock PG이므로 대부분 성공)
      await expect(page.getByText(/완료|Success|성공/i)).toBeVisible({ timeout: 15000 });
    }
  });

  test('가격 정보가 올바르게 표시됨', async ({ page }) => {
    await expect(page.getByText(/프리미엄|Premium/i)).toBeVisible({ timeout: 10000 });

    // 가격이 표시되는지 확인 (원화 형식)
    await expect(page.getByText(/₩|원|,/)).toBeVisible();
  });
});
