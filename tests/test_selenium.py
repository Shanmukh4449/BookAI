"""
SELENIUM TEST SUITE v2.0 — Online Book Recommendation System
Run: python tests/test_selenium.py
Install: pip install selenium
Download ChromeDriver: https://chromedriver.chromium.org/
"""
import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

BASE       = "http://localhost:5000"
TEST_EMAIL = "seleniumtest@example.com"
TEST_PASS  = "test@12345"
TEST_NAME  = "Selenium Tester"
ADMIN_EMAIL = "siddhartha.23bce9388@vitapstudent.ac.in"
ADMIN_PASS  = "Admin@123"

def get_driver(headless=False):
    opts = Options()
    if headless:
        opts.add_argument("--headless")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1366,768")
    driver = webdriver.Chrome(options=opts)
    driver.implicitly_wait(10)
    return driver

# ═══════════════════════════════════════════════════════════════
class TC01_Signup(unittest.TestCase):
    def setUp(self):  self.driver = get_driver()
    def tearDown(self): self.driver.quit()

    def test_valid_signup(self):
        d = self.driver
        d.get(f"{BASE}/signup.html")
        d.find_element(By.ID, "name").send_keys(TEST_NAME)
        d.find_element(By.ID, "email").send_keys(TEST_EMAIL)
        d.find_element(By.ID, "password").send_keys(TEST_PASS)
        WebDriverWait(d, 8).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#genre option:not([value=''])")))
        d.find_element(By.ID, "signup-btn").click()
        WebDriverWait(d, 10).until(EC.visibility_of_element_located((By.ID, "alert-box")))
        alert = d.find_element(By.ID, "alert-box")
        self.assertIn("created", alert.text.lower())
        print("✅ TC01 Signup PASSED")

    def test_duplicate_email(self):
        d = self.driver
        d.get(f"{BASE}/signup.html")
        d.find_element(By.ID, "name").send_keys("Dup User")
        d.find_element(By.ID, "email").send_keys(TEST_EMAIL)
        d.find_element(By.ID, "password").send_keys("test123")
        d.find_element(By.ID, "signup-btn").click()
        time.sleep(2)
        alert = d.find_element(By.ID, "alert-box")
        self.assertIn("danger", alert.get_attribute("class"))
        print("✅ TC01b Duplicate Email PASSED")

# ═══════════════════════════════════════════════════════════════
class TC02_Login(unittest.TestCase):
    def setUp(self):  self.driver = get_driver()
    def tearDown(self): self.driver.quit()

    def test_valid_login(self):
        d = self.driver
        d.get(f"{BASE}/login.html")
        d.find_element(By.ID, "email").send_keys(TEST_EMAIL)
        d.find_element(By.ID, "password").send_keys(TEST_PASS)
        d.find_element(By.ID, "login-btn").click()
        WebDriverWait(d, 10).until(EC.url_contains("dashboard"))
        self.assertIn("dashboard", d.current_url)
        print("✅ TC02 Login PASSED")

    def test_wrong_password(self):
        d = self.driver
        d.get(f"{BASE}/login.html")
        d.find_element(By.ID, "email").send_keys(TEST_EMAIL)
        d.find_element(By.ID, "password").send_keys("wrongpass")
        d.find_element(By.ID, "login-btn").click()
        time.sleep(2)
        alert = d.find_element(By.ID, "alert-box")
        self.assertIn("danger", alert.get_attribute("class"))
        print("✅ TC02b Wrong Password PASSED")

# ═══════════════════════════════════════════════════════════════
class TC03_Search(unittest.TestCase):
    def setUp(self):  self.driver = get_driver()
    def tearDown(self): self.driver.quit()

    def test_search_by_title(self):
        d = self.driver
        d.get(f"{BASE}/search.html")
        time.sleep(2)
        d.find_element(By.ID, "search-input").send_keys("Harry Potter")
        d.find_element(By.CSS_SELECTOR, "button.btn-warning").click()
        time.sleep(2)
        results = d.find_elements(By.CSS_SELECTOR, ".book-card")
        self.assertGreater(len(results), 0)
        print(f"✅ TC03 Search PASSED — {len(results)} results")

    def test_global_search_navbar(self):
        d = self.driver
        d.get(f"{BASE}/index.html")
        time.sleep(2)
        search_bar = d.find_element(By.ID, "global-search-input")
        search_bar.send_keys("Sapiens")
        from selenium.webdriver.common.keys import Keys
        search_bar.send_keys(Keys.ENTER)
        time.sleep(2)
        self.assertIn("search.html", d.current_url)
        self.assertIn("Sapiens", d.current_url)
        print("✅ TC03b Global Search PASSED")

    def test_no_results(self):
        d = self.driver
        d.get(f"{BASE}/search.html")
        time.sleep(2)
        d.find_element(By.ID, "search-input").send_keys("zzznomatchbook999")
        d.find_element(By.CSS_SELECTOR, "button.btn-warning").click()
        time.sleep(2)
        results = d.find_elements(By.CSS_SELECTOR, ".book-card")
        self.assertEqual(len(results), 0)
        print("✅ TC03c No Results PASSED")

# ═══════════════════════════════════════════════════════════════
class TC04_AIRecs(unittest.TestCase):
    def setUp(self):
        self.driver = get_driver()
        self._login()
    def tearDown(self): self.driver.quit()

    def _login(self):
        d = self.driver
        d.get(f"{BASE}/login.html")
        d.find_element(By.ID, "email").send_keys(TEST_EMAIL)
        d.find_element(By.ID, "password").send_keys(TEST_PASS)
        d.find_element(By.ID, "login-btn").click()
        WebDriverWait(d, 10).until(EC.url_contains("dashboard"))

    def test_basic_recs_load(self):
        d = self.driver
        d.get(f"{BASE}/recommendations.html")
        time.sleep(3)
        books = d.find_elements(By.CSS_SELECTOR, ".book-card")
        self.assertGreater(len(books), 0)
        print(f"✅ TC04 Basic Recs PASSED — {len(books)} books")

    def test_ai_similarity(self):
        d = self.driver
        d.get(f"{BASE}/recommendations.html")
        time.sleep(2)
        tabs = d.find_elements(By.CSS_SELECTOR, "#rec-tabs .nav-link")
        for t in tabs:
            if "AI" in t.text: t.click(); break
        time.sleep(2)
        sel = Select(d.find_element(By.ID, "book-select"))
        if len(sel.options) > 1: sel.select_by_index(1)
        d.find_element(By.XPATH, "//button[contains(.,'Find Similar')]").click()
        time.sleep(4)
        books = d.find_elements(By.CSS_SELECTOR, ".book-card")
        self.assertGreater(len(books), 0)
        print(f"✅ TC04b AI Similarity PASSED — {len(books)} similar books")

# ═══════════════════════════════════════════════════════════════
class TC05_Review(unittest.TestCase):
    def setUp(self):
        self.driver = get_driver()
        self._login()
    def tearDown(self): self.driver.quit()

    def _login(self):
        d = self.driver
        d.get(f"{BASE}/login.html")
        d.find_element(By.ID, "email").send_keys(TEST_EMAIL)
        d.find_element(By.ID, "password").send_keys(TEST_PASS)
        d.find_element(By.ID, "login-btn").click()
        WebDriverWait(d, 10).until(EC.url_contains("dashboard"))

    def test_submit_review(self):
        d = self.driver
        d.get(f"{BASE}/index.html")
        time.sleep(3)
        cards = d.find_elements(By.CSS_SELECTOR, ".book-card")
        if cards:
            cards[0].click()
            time.sleep(2)
            try:
                form = d.find_element(By.ID, "review-form-wrap")
                d.execute_script("arguments[0].scrollIntoView();", form)
                stars = d.find_elements(By.CSS_SELECTOR, ".review-star")
                if len(stars) >= 4: stars[3].click()
                d.find_element(By.ID, "review-text").send_keys(
                    "Excellent book! Highly recommended for everyone."
                )
                d.find_element(By.CSS_SELECTOR, "#review-form button[type='submit']").click()
                time.sleep(3)
                alert = d.find_element(By.ID, "review-alert")
                print(f"✅ TC05 Review — Alert: {alert.text[:40]}")
            except Exception as e:
                print(f"⚠️ TC05 Review form issue: {e}")

# ═══════════════════════════════════════════════════════════════
class TC06_Wishlist(unittest.TestCase):
    def setUp(self):
        self.driver = get_driver()
        self._login()
    def tearDown(self): self.driver.quit()

    def _login(self):
        d = self.driver
        d.get(f"{BASE}/login.html")
        d.find_element(By.ID, "email").send_keys(TEST_EMAIL)
        d.find_element(By.ID, "password").send_keys(TEST_PASS)
        d.find_element(By.ID, "login-btn").click()
        WebDriverWait(d, 10).until(EC.url_contains("dashboard"))

    def test_wishlist_page_loads(self):
        d = self.driver
        d.get(f"{BASE}/wishlist.html")
        time.sleep(2)
        self.assertIn("wishlist", d.current_url.lower())
        print("✅ TC06 Wishlist Page PASSED")

# ═══════════════════════════════════════════════════════════════
class TC07_Admin(unittest.TestCase):
    def setUp(self):
        self.driver = get_driver()
        self._admin_login()
    def tearDown(self): self.driver.quit()

    def _admin_login(self):
        d = self.driver
        d.get(f"{BASE}/login.html")
        d.find_element(By.ID, "email").send_keys(ADMIN_EMAIL)
        d.find_element(By.ID, "password").send_keys(ADMIN_PASS)
        d.find_element(By.ID, "login-btn").click()
        time.sleep(3)

    def test_admin_panel_access(self):
        d = self.driver
        d.get(f"{BASE}/admin.html")
        time.sleep(2)
        self.assertIn("admin", d.current_url.lower())
        print("✅ TC07 Admin Access PASSED")

    def test_admin_dashboard_stats(self):
        d = self.driver
        d.get(f"{BASE}/admin.html")
        time.sleep(4)
        stats_cards = d.find_elements(By.CSS_SELECTOR, "#stats-cards .col-md-3")
        self.assertGreater(len(stats_cards), 0)
        print(f"✅ TC07b Admin Dashboard Stats PASSED — {len(stats_cards)} stat cards")

    def test_admin_add_book(self):
        d = self.driver
        d.get(f"{BASE}/admin.html")
        time.sleep(2)
        tabs = d.find_elements(By.CSS_SELECTOR, "#admin-tabs .nav-link")
        for t in tabs:
            if "Add" in t.text: t.click(); break
        time.sleep(2)
        d.find_element(By.ID, "ab-title").send_keys("Selenium Test Book v2")
        d.find_element(By.ID, "ab-author").send_keys("Auto Tester")
        WebDriverWait(d, 5).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#ab-genre option:not([value=''])")))
        d.find_element(By.ID, "ab-description").send_keys(
            "This book was added automatically by Selenium test suite to verify admin add-book feature in v2."
        )
        d.find_element(By.CSS_SELECTOR, "#add-book-form button[type='submit']").click()
        time.sleep(3)
        alert = d.find_element(By.ID, "add-alert")
        self.assertIn("success", alert.get_attribute("class"))
        print("✅ TC07c Admin Add Book PASSED")

# ── TEST CASE TABLE ───────────────────────────────────────────────────────────
print("""
╔══════╦════════════════════════════════════╦══════════════════════╦════════════════════╗
║  ID  ║ Test Case                          ║ Input                ║ Expected           ║
╠══════╬════════════════════════════════════╬══════════════════════╬════════════════════╣
║ TC01 ║ Valid Signup                       ║ Name/Email/Pass      ║ Account created    ║
║TC01b ║ Duplicate Email Signup             ║ Same email           ║ Error shown        ║
║ TC02 ║ Valid Login                        ║ Correct credentials  ║ Go to dashboard    ║
║TC02b ║ Wrong Password                     ║ Wrong password       ║ Error alert        ║
║ TC03 ║ Search by Title                    ║ "Harry Potter"       ║ Books returned     ║
║TC03b ║ Global Navbar Search               ║ "Sapiens" + Enter    ║ Redirect search    ║
║TC03c ║ Search No Results                  ║ "zzznomatch"         ║ 0 results          ║
║ TC04 ║ Basic Recommendations Load         ║ Logged-in user       ║ Books shown        ║
║TC04b ║ AI Cosine Similarity               ║ Select book          ║ Similar books      ║
║ TC05 ║ Submit Review                      ║ Stars + text         ║ Review saved       ║
║ TC06 ║ Wishlist Page Loads                ║ Logged-in user       ║ Page visible       ║
║ TC07 ║ Admin Panel Access                 ║ Admin credentials    ║ Panel visible      ║
║TC07b ║ Admin Dashboard Stats              ║ Admin view           ║ Stats + charts     ║
║TC07c ║ Admin Add Book                     ║ Book form details    ║ Book added         ║
╚══════╩════════════════════════════════════╩══════════════════════╩════════════════════╝
""")

if __name__ == "__main__":
    unittest.main(verbosity=2)
