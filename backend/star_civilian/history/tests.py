from datetime import date
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Credential, Position


User = get_user_model()

# ---------- Model tests ----------
class PositionModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="steph", password="pass12345")

    def test_default_type_is_military(self):
        p = Position.objects.create(user=self.user, title="Motor T Operator", start_date=date(2019, 1, 1))
        self.assertEqual(p.experience_type, "military")

    def test_str(self):
        p = Position.objects.create(user=self.user, title="Motor T Operator", start_date=date(2019, 1, 1))
        self.assertIn("Motor T Operator", str(p))

    def test_newest_first(self):
        old = Position.objects.create(user=self.user, title="Old", start_date=date(2018, 1, 1))
        new = Position.objects.create(user=self.user, title="New", start_date=date(2022, 1, 1))
        self.assertEqual(list(Position.objects.all()), [new, old])


class CredentialModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="steph", password="pass12345")

    def test_str(self):
        c = Credential.objects.create(user=self.user, name="Hazmat", credential_type="certification")
        self.assertIn("Hazmat", str(c))

    def test_undated_credentials_sort_last(self):
        undated = Credential.objects.create(user=self.user, name="Undated", credential_type="award")
        dated = Credential.objects.create(
            user=self.user, name="Dated", credential_type="award", date_earned=date(2021, 5, 1)
        )
        self.assertEqual(list(Credential.objects.all()), [dated, undated])


# ---------- API tests ----------
# Needs history/urls.py registered at api/history/ in config/urls.py
class PositionAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="steph", password="pass12345")
        self.other = User.objects.create_user(username="other", password="pass12345")
        self.list_url = reverse("position-list")
        self.mine = Position.objects.create(user=self.user, title="Mine", start_date=date(2020, 1, 1))
        self.theirs = Position.objects.create(user=self.other, title="Theirs", start_date=date(2020, 1, 1))

    def detail_url(self, pk):
        return reverse("position-detail", args=[pk])

    def test_must_be_logged_in(self):
        res = self.client.get(self.list_url)
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_list_shows_only_my_positions(self):
        self.client.force_authenticate(self.user)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [p["title"] for p in res.data]
        self.assertEqual(titles, ["Mine"])

    def test_create_military_sets_user(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(self.list_url, {
            "experience_type": "military",
            "title": "Squad Leader",
            "start_date": "2021-03-01",
            "branch": "marine_corps",
            "rank": "Sergeant (E-5)",
            "mos_code": "3531",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        created = Position.objects.get(pk=res.data["id"])
        self.assertEqual(created.user, self.user)

    def test_create_civilian(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(self.list_url, {
            "experience_type": "civilian",
            "title": "Logistics Coordinator",
            "start_date": "2023-07-01",
            "employer": "Acme",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["experience_type"], "civilian")

    def test_cannot_set_user_to_someone_else(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(self.list_url, {
            "title": "Sneaky",
            "start_date": "2021-01-01",
            "user": self.other.id,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Position.objects.get(pk=res.data["id"]).user, self.user)

    def test_missing_title_fails(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(self.list_url, {"start_date": "2021-01-01"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_my_position(self):
        self.client.force_authenticate(self.user)
        res = self.client.patch(self.detail_url(self.mine.pk), {"title": "Updated"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.mine.refresh_from_db()
        self.assertEqual(self.mine.title, "Updated")

    def test_delete_my_position(self):
        self.client.force_authenticate(self.user)
        res = self.client.delete(self.detail_url(self.mine.pk))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Position.objects.filter(pk=self.mine.pk).exists())

    def test_cannot_see_edit_or_delete_others(self):
        self.client.force_authenticate(self.user)
        url = self.detail_url(self.theirs.pk)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.patch(url, {"title": "Hacked"}).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.theirs.refresh_from_db()
        self.assertEqual(self.theirs.title, "Theirs")


class CredentialAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="steph", password="pass12345")
        self.other = User.objects.create_user(username="other", password="pass12345")
        self.list_url = reverse("credential-list")
        Credential.objects.create(user=self.other, name="Theirs", credential_type="award")

    def test_create_and_list_only_mine(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(self.list_url, {"name": "Hazmat", "credential_type": "certification"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        names = [c["name"] for c in self.client.get(self.list_url).data]
        self.assertEqual(names, ["Hazmat"])

    def test_invalid_type_fails(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(self.list_url, {"name": "X", "credential_type": "not-a-type"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)