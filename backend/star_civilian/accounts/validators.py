from django.core.exceptions import ValidationError

def validate_starts_with_uppercase(value):
    if not value or not value[0].isupper():
        raise ValidationError("Names must start with an uppercase letter.")
    
def validate_city(value):
    for ch in value:
        if not (ch.isalpha() or ch in " .'-"):
            raise ValidationError("City can only contain letters, spaces, hyphens, apostrophes, and periods.")
    if not any(ch.isalpha() for ch in value):
        raise ValidationError("City must contain at least one letter.")
    
def validate_phone(value):
    if any(ch not in "0123456789 ()-.+" for ch in value) or "+" in value[1:]:
        raise ValidationError("Phone can only contain digits, spaces, dashes, dots, parentheses, and a + at the start.")
    digit_count = sum(1 for ch in value if ch in "0123456789")
    if not 10 <= digit_count <= 15:
        raise ValidationError("Phone number must have between 10 and 15 digits.")