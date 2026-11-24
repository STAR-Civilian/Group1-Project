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
