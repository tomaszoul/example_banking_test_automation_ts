import { test, expect } from '../fixtures'
import { LoginPage } from '../pages/LoginPage'
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage'
import { HomePage, CustomerLoginPage } from '../locators/selectors'
import { expectVisible } from '../helpers/assert-helpers'

test.describe('Customer Login', () => {
  /**
   * Verifies home page offers customer and manager login, lists known customers,
   * and hides the Login button until a customer is selected from the dropdown.
   */
  test('should show login options and list all customers in dropdown', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goToHome()

    await expectVisible(page.locator(HomePage.customerLoginBtn))
    await expectVisible(page.locator(HomePage.managerLoginBtn))
    await expect(page.locator(HomePage.heading)).toContainText('XYZ Bank')

    await login.selectCustomerLogin()

    const options = await page.locator(`${CustomerLoginPage.userSelect} option`).allTextContents()
    expect(options).toContain('Hermoine Granger')
    expect(options).toContain('Harry Potter')
    expect(options).toContain('Ron Weasly')
    expect(options).toContain('Albus Dumbledore')
    expect(options).toContain('Neville Longbottom')

    // Login button should not be visible until a user is selected
    const loginBtn = page.locator(CustomerLoginPage.loginBtn)
    await expect(loginBtn).toBeHidden()
  })

  test('should show dashboard after login and return to login page on logout', async ({ page, bankUser }) => {
    const login = new LoginPage(page)
    const dashboard = new CustomerDashboardPage(page)

    await login.loginAsCustomer(bankUser.name)
    await dashboard.expectLoaded()

    const welcomeText = await dashboard.getWelcomeText()
    expect(welcomeText).toContain(bankUser.name)

    await dashboard.clickLogout()

    await expectVisible(page.locator(CustomerLoginPage.userSelect))
    await expect(page.locator(CustomerLoginPage.loginBtn)).toBeHidden()
  })
})
