import ast
import math
import operator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.models import User

router = APIRouter(prefix="/tools", tags=["AI Tools"])

_BINARY_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

_UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

_SAFE_FUNCS = {
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "abs": abs,
    "round": round,
    "floor": math.floor,
    "ceil": math.ceil,
}

_SAFE_CONSTS = {
    "pi": math.pi,
    "e": math.e,
}


class CalculateRequest(BaseModel):
    expression: str = Field(min_length=1, max_length=160)


def _eval_ast(node: ast.AST, depth: int = 0) -> float:
    if depth > 16:
        raise ValueError("Expression nesting limit exceeded.")
    if isinstance(node, ast.Expression):
        return _eval_ast(node.body, depth + 1)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.Name) and node.id in _SAFE_CONSTS:
        return float(_SAFE_CONSTS[node.id])
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPS:
        return float(_UNARY_OPS[type(node.op)](_eval_ast(node.operand, depth + 1)))
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY_OPS:
        left = _eval_ast(node.left, depth + 1)
        right = _eval_ast(node.right, depth + 1)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("Exponent magnitude limit exceeded (max 100).")
        if isinstance(node.op, (ast.Div, ast.FloorDiv, ast.Mod)) and right == 0:
            raise ValueError("Division by zero.")
        return float(_BINARY_OPS[type(node.op)](left, right))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in _SAFE_FUNCS:
        if len(node.args) != 1 or node.keywords:
            raise ValueError("Functions accept exactly one positional numeric argument.")
        val = _eval_ast(node.args[0], depth + 1)
        return float(_SAFE_FUNCS[node.func.id](val))
    raise ValueError("Unsupported syntax in mathematical expression.")


@router.get("/status")
async def tools_status() -> list[dict[str, Any]]:
    settings = get_settings()
    image_ok = bool(settings.OPENAI_API_KEY.strip() or settings.GEMINI_API_KEY.strip())
    return [
        {"id": "calculator", "name": "AST Math Calculator", "status": "configured", "implemented": True},
        {"id": "rag", "name": "Document Knowledge RAG (Lexical Chunking)", "status": "configured", "implemented": True},
        {"id": "data_analysis", "name": "CSV / XLSX / JSON Analysis", "status": "configured", "implemented": True},
        {"id": "charts", "name": "Recharts Visualization Engine", "status": "configured", "implemented": True},
        {"id": "diagrams", "name": "Mermaid Architecture Renderer", "status": "configured", "implemented": True},
        {
            "id": "image_generation",
            "name": "Image Studio (DALL-E / Imagen)",
            "status": "configured" if image_ok else "blocked_missing_api_key",
            "implemented": True,
        },
        {"id": "web_search", "name": "Live Web Search", "status": "not_implemented", "implemented": False},
        {"id": "weather", "name": "Weather API", "status": "not_implemented", "implemented": False},
        {"id": "voice", "name": "Voice STT / TTS Audio", "status": "not_implemented", "implemented": False},
    ]


@router.post("/calculate")
async def run_calculator(
    payload: CalculateRequest,
    _: User = Depends(get_current_user),
) -> dict[str, Any]:
    expr = payload.expression.strip()
    try:
        parsed = ast.parse(expr, mode="eval")
        result = _eval_ast(parsed)
        if math.isnan(result) or math.isinf(result):
            raise ValueError("Result is not finite.")
    except (SyntaxError, ValueError, OverflowError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Calculator validation error: {exc}",
        ) from exc

    formatted = int(result) if result.is_integer() and abs(result) < 1e15 else round(result, 8)
    return {"expression": expr, "result": formatted}

