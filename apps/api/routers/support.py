from __future__ import annotations
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from packages.db.session import get_db
from packages.db.models import SupportTicket, TicketMessage
from apps.api.schemas import TicketCreate, TicketMessageCreate

router = APIRouter(prefix="/support")


@router.post("/tickets", status_code=201)
def create_ticket(body: TicketCreate, db: Session = Depends(get_db)):
    tid = f"tkt_{uuid.uuid4().hex[:12]}"
    ticket = SupportTicket(
        id=tid,
        requester_type=body.requester_type,
        requester_id=body.requester_id,
        order_id=body.order_id,
        subject=body.subject,
        status="OPEN",
        priority=body.priority,
        category=body.category,
    )
    db.add(ticket)
    # First message
    msg = TicketMessage(
        id=f"tmsg_{uuid.uuid4().hex[:12]}",
        ticket_id=tid,
        sender_type=body.requester_type,
        sender_id=body.requester_id,
        body=body.body,
    )
    db.add(msg)
    db.commit()
    db.refresh(ticket)
    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "status": ticket.status,
        "priority": ticket.priority,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
    }


@router.get("/tickets")
def list_tickets(
    requester_type: str = Query(...),
    requester_id: str = Query(...),
    db: Session = Depends(get_db),
):
    tickets = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.requester_type == requester_type,
            SupportTicket.requester_id == requester_id,
        )
        .order_by(SupportTicket.updated_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "subject": t.subject,
            "status": t.status,
            "priority": t.priority,
            "category": t.category,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in tickets
    ]


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "ticket not found")
    messages = (
        db.query(TicketMessage)
        .filter(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
        .all()
    )
    return {
        "id": ticket.id,
        "requester_type": ticket.requester_type,
        "requester_id": ticket.requester_id,
        "order_id": ticket.order_id,
        "subject": ticket.subject,
        "status": ticket.status,
        "priority": ticket.priority,
        "category": ticket.category,
        "assigned_to": ticket.assigned_to,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        "messages": [
            {
                "id": m.id,
                "sender_type": m.sender_type,
                "sender_id": m.sender_id,
                "body": m.body,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


@router.post("/tickets/{ticket_id}/messages", status_code=201)
def post_message(ticket_id: str, body: TicketMessageCreate, db: Session = Depends(get_db)):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "ticket not found")
    msg = TicketMessage(
        id=f"tmsg_{uuid.uuid4().hex[:12]}",
        ticket_id=ticket_id,
        sender_type=body.sender_type,
        sender_id=body.sender_id,
        body=body.body,
    )
    db.add(msg)
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    return {
        "id": msg.id,
        "sender_type": msg.sender_type,
        "sender_id": msg.sender_id,
        "body": msg.body,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }
