from rest_framework.test import APITestCase

SIGNUP = {
    "email": "vet@example.com",
    "password": "Str0ng-pass-123",
    "first_name": "Jane",
    "last_name": "Doe",
    "city": "San Diego",
    "state": "ca",
}


class ProfileTests(APITestCase):
    def signup(self, **extra):
        res = self.client.post("/api/signup/", {**SIGNUP, **extra}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {res.data.get('token')}")
        return res

    def test_phone_is_optional(self):
        self.assertEqual(self.signup().status_code, 201)
        me = self.client.get("/api/profile/me/").data
        self.assertEqual(me["phone"], "")

    def test_links_saved_and_get_https(self):
        self.signup(linkedin_url="linkedin.com/in/jane")
        me = self.client.get("/api/profile/me/").data
        self.assertEqual(me["linkedin_url"], "https://linkedin.com/in/jane")
        self.assertEqual(me["github_url"], "")

    def test_put_updates_links_and_keeps_unsent_ones(self):
        self.signup(github_url="https://github.com/jane")
        body = {**SIGNUP, "website_url": "jane.dev"}
        res = self.client.put("/api/profile/me/", body, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["website_url"], "https://jane.dev")
        self.assertEqual(res.data["github_url"], "https://github.com/jane")  # not sent, kept

    def test_bad_link_rejected(self):
        self.signup()
        body = {**SIGNUP, "linkedin_url": "not a url"}
        res = self.client.put("/api/profile/me/", body, format="json")
        self.assertEqual(res.status_code, 400)

    def test_rank_is_optional_and_saves(self):
        self.signup()
        self.assertEqual(self.client.get("/api/profile/me/").data["rank"], "")
        res = self.client.put("/api/profile/me/", {**SIGNUP, "rank": "Sergeant (E-5)"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["rank"], "Sergeant (E-5)")

    def test_website_title_saves(self):
        self.signup()
        body = {**SIGNUP, "website_url": "jane.dev", "website_title": "Portfolio"}
        res = self.client.put("/api/profile/me/", body, format="json")
        self.assertEqual(res.data["website_title"], "Portfolio")

    def test_phone_is_formatted(self):
        self.signup(phone="5551234567")
        self.assertEqual(self.client.get("/api/profile/me/").data["phone"], "(555) 123-4567")
        for typed in ["555-123-4567", "555.123.4567", "+1 555 123 4567", "15551234567"]:
            res = self.client.put("/api/profile/me/", {**SIGNUP, "phone": typed}, format="json")
            self.assertEqual(res.data["phone"], "(555) 123-4567", typed)

    def test_international_phone_kept(self):
        self.signup(phone="+44 20 7946 0958")
        self.assertEqual(self.client.get("/api/profile/me/").data["phone"], "+44 20 7946 0958")
