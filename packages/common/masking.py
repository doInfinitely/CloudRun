def mask_id_last4(last4: str | None) -> str | None:
    if not last4:
        return None
    return last4[-4:]

def mask_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return email
    name, dom = email.split("@", 1)
    if len(name) <= 2:
        return "*" * len(name) + "@" + dom
    return name[0] + "*"*(len(name)-2) + name[-1] + "@" + dom
