import { test, expect } from '@playwright/test';

test.describe('App Loading', () => {
  test('loads the main page', async ({ page }) => {
    await page.goto('/');
    // Should show the welcome screen or app layout
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays navbar with app title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Copilot Desktop', exact: true })).toBeVisible();
  });

  test('has sidebar toggle button', async ({ page }) => {
    await page.goto('/');
    const toggleBtn = page.getByLabel('Toggle sidebar');
    await expect(toggleBtn).toBeVisible();
  });

  test('has theme toggle button', async ({ page }) => {
    await page.goto('/');
    const themeBtn = page.getByLabel('Toggle theme');
    await expect(themeBtn).toBeVisible();
  });
});

test.describe('Welcome Screen', () => {
  test('shows welcome heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to Copilot Desktop')).toBeVisible();
  });

  test('shows suggestion cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Write code')).toBeVisible();
    await expect(page.getByText('Analyze data')).toBeVisible();
  });

  test('shows message input', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
  });
});

test.describe('Sidebar', () => {
  test('sidebar is visible by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('New Chat')).toBeVisible();
  });

  test('sidebar can be toggled', async ({ page }) => {
    await page.goto('/');
    const newChatBtn = page.getByText('New Chat');
    await expect(newChatBtn).toBeVisible();

    // Toggle sidebar closed
    await page.getByLabel('Toggle sidebar').click();
    // Give time for animation
    await page.waitForTimeout(300);

    // Toggle sidebar open
    await page.getByLabel('Toggle sidebar').click();
    await page.waitForTimeout(300);
    await expect(newChatBtn).toBeVisible();
  });

  test('has search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Search conversations...')).toBeVisible();
  });

  test('shows empty state when no conversations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('No conversations yet')).toBeVisible();
  });
});

test.describe('Theme', () => {
  test('can toggle theme', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');

    // Default should be dark
    await expect(html).toHaveClass(/dark/);

    // Toggle to light
    await page.getByLabel('Toggle theme').click();
    await expect(html).not.toHaveClass(/dark/);

    // Toggle back to dark
    await page.getByLabel('Toggle theme').click();
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe('Message Input', () => {
  test('send button is initially disabled', async ({ page }) => {
    await page.goto('/');
    const sendBtn = page.getByLabel('Send message');
    await expect(sendBtn).toBeDisabled();
  });

  test('send button enables when text is entered', async ({ page }) => {
    await page.goto('/');
    const textarea = page.getByPlaceholder('Send a message...');
    await textarea.fill('Hello');
    const sendBtn = page.getByLabel('Send message');
    await expect(sendBtn).toBeEnabled();
  });

  test('textarea is clearable', async ({ page }) => {
    await page.goto('/');
    const textarea = page.getByPlaceholder('Send a message...');
    await textarea.fill('Hello');
    await textarea.fill('');
    const sendBtn = page.getByLabel('Send message');
    await expect(sendBtn).toBeDisabled();
  });
});

test.describe('Settings', () => {
  test('settings button exists in sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Settings')).toBeVisible();
  });
});
