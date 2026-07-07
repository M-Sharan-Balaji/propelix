"""Mythos SDK integration for Propelix.

Lets this app be launched from Mythos (?lt=<launch token> in the URL) and reports
usage credits for billable actions (price analysis, listing publish).
"""
from fastapi import APIRouter, Depends, HTTPException
from mythos_sdk import MythosError, MythosSession, handshake_router, report_usage, require_launch_token
from pydantic import BaseModel

router = APIRouter()
router.include_router(handshake_router)


class MythosSessionResponse(BaseModel):
    userId: str
    email: str
    displayName: str
    listingId: str
    sessionJti: str


@router.get("/api/mythos/session", response_model=MythosSessionResponse)
async def mythos_session(session: MythosSession = Depends(require_launch_token)) -> MythosSessionResponse:
    """Verify + single-use-consume the Mythos launch token, return the session to the frontend."""
    return MythosSessionResponse(
        userId=session.userId,
        email=session.email,
        displayName=session.displayName,
        listingId=session.listingId,
        sessionJti=session.sessionJti,
    )


class ReportUsageRequest(BaseModel):
    session_jti: str
    credits: int = 1
    reason: str | None = None


@router.post("/api/mythos/report-usage")
async def mythos_report_usage(request: ReportUsageRequest) -> dict[str, bool]:
    """Debit the Mythos wallet for the given session after a billable action."""
    try:
        await report_usage(request.session_jti, request.credits, request.reason)
    except MythosError as e:
        raise HTTPException(status_code=402, detail=str(e)) from e
    return {"success": True}
