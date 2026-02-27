class DomainError(Exception):
    pass

class InvalidStateTransition(DomainError):
    pass

class ComplianceError(DomainError):
    pass

class NotFound(DomainError):
    pass

class Forbidden(DomainError):
    pass
