"""Controlled capability layer for Empire OS."""
from __future__ import annotations
import hashlib, math, subprocess, sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable
from .decision_engine import DecisionEngineCapability
from .file_read import FileReadCapability
from .file_write import FileWriteCapability
from .git_status import GitStatusCapability
from .project_search import ProjectSearchCapability
from .tasks import Task

CapabilityHandler = Callable[[Task], Any]
CapabilityInputValidator = Callable[[Any], bool]
CapabilityVerifier = Callable[["CapabilityResult"], bool]
class CapabilityError(RuntimeError): pass
@dataclass(frozen=True, slots=True)
class CapabilityResult:
    ok: bool; capability: str; data: dict[str, Any] | None = None; error: str | None = None
    def to_dict(self) -> dict[str, Any]: return {"ok": self.ok, "capability": self.capability, "data": self.data or {}, "error": self.error}
@dataclass(frozen=True, slots=True)
class CapabilityContract:
    name: str; handler: CapabilityHandler; verify: CapabilityVerifier; validate_input: CapabilityInputValidator = lambda value: isinstance(value, Task)
    def validate(self, task: Any) -> None:
        if not self.validate_input(task): raise CapabilityError(f"Invalid input for capability: {self.name}")
    def execute(self, task: Task) -> CapabilityResult:
        self.validate(task); raw = self.handler(task)
        if isinstance(raw, CapabilityResult): result = raw
        elif isinstance(raw, dict): result = CapabilityResult(bool(raw.get("ok", False)), str(raw.get("capability", self.name)), raw.get("data") if isinstance(raw.get("data"), dict) else {}, raw.get("error"))
        else: raise CapabilityError(f"Malformed capability result for: {self.name}")
        if result.capability != self.name: raise CapabilityError(f"Capability result mismatch: expected {self.name}, got {result.capability}")
        return result
    def evidence(self, result: CapabilityResult) -> dict[str, Any]: return result.to_dict()
    def verified(self, result: CapabilityResult) -> bool: return bool(self.verify(result))
class CapabilityRegistry:
    def __init__(self) -> None: self._contracts: dict[str, CapabilityContract] = {}
    def register(self, name: str, handler: CapabilityHandler, *, verifier: CapabilityVerifier | None = None, input_validator: CapabilityInputValidator | None = None) -> None:
        if not name or not callable(handler): raise ValueError("Capability name and callable handler are required.")
        self._contracts[name] = CapabilityContract(name, handler, verifier or (lambda result: result.ok and result.error is None), input_validator or (lambda value: isinstance(value, Task)))
    def has(self, name: str) -> bool: return name in self._contracts
    def get(self, name: str) -> CapabilityContract:
        contract = self._contracts.get(name)
        if contract is None: raise CapabilityError(f"Capability is not registered: {name}")
        return contract
    def execute(self, name: str, task: Task) -> CapabilityResult: return self.get(name).execute(task)
    def verify(self, name: str, result: Any) -> bool:
        try: return isinstance(result, CapabilityResult) and result.capability == name and self.get(name).verified(result)
        except CapabilityError: return False
    def evidence(self, name: str, result: Any) -> dict[str, Any] | None: return self.get(name).evidence(result) if isinstance(result, CapabilityResult) and result.capability == name else None
    @property
    def names(self) -> tuple[str, ...]: return tuple(sorted(self._contracts))
class EmpireCapabilityExecutor:
    TEST_TIMEOUT_SECONDS = 300; TEST_OUTPUT_MAX_CHARS = 4000
    def __init__(self, project_root: str | Path | None = None) -> None:
        self.project_root = Path(project_root or Path(__file__).resolve().parents[2]).resolve(); self.registry = CapabilityRegistry()
        self.registry.register("file_read", FileReadCapability(self.project_root).execute, verifier=self._verify_file_read, input_validator=FileReadCapability.validate_task)
        self.registry.register("file_write", FileWriteCapability(self.project_root).execute, verifier=self._verify_file_write, input_validator=FileWriteCapability.validate_task)
        self.registry.register("project_inspection", self.inspect_project, verifier=self._verify_project_inspection)
        self.registry.register("project_search", ProjectSearchCapability(self.project_root).execute, verifier=self._verify_project_search)
        self.registry.register("test_runner", self.run_tests, verifier=self._verify_test_runner)
        self.registry.register("git_status", GitStatusCapability(self.project_root).execute, verifier=self._verify_git_status)
        self.decision_engine = DecisionEngineCapability(); self.registry.register("decision_engine", self.decision_engine.execute, verifier=self._verify_decision_engine, input_validator=DecisionEngineCapability.validate_task)
    def execute(self, capability: str, task: Task) -> CapabilityResult: return self.registry.execute(capability, task)
    def verify(self, capability: str, result: Any) -> bool: return self.registry.verify(capability, result)
    @staticmethod
    def _verify_project_inspection(result: CapabilityResult) -> bool:
        d=result.data or {}; return result.ok and result.error is None and isinstance(d.get("project_root"),str) and bool(d["project_root"]) and isinstance(d.get("files"),int) and d["files"]>=0 and isinstance(d.get("directories"),int) and d["directories"]>=0
    @staticmethod
    def _verify_project_search(result: CapabilityResult) -> bool:
        d=result.data or {}; m=d.get("matches"); return result.ok and result.error is None and isinstance(d.get("query"),str) and bool(d["query"].strip()) and isinstance(d.get("match_count"),int) and d["match_count"]==len(m) if isinstance(m,list) else False
    @staticmethod
    def _verify_test_runner(result: CapabilityResult) -> bool:
        d=result.data or {}; return result.ok and result.error is None and d.get("return_code")==0 and isinstance(d.get("stdout"),str) and len(d["stdout"])<=4000 and isinstance(d.get("stderr"),str) and len(d["stderr"])<=4000
    @staticmethod
    def _verify_git_status(result: CapabilityResult) -> bool:
        d=result.data or {}; sha=d.get("commit_sha"); return result.ok and result.error is None and isinstance(d.get("branch"),str) and bool(d["branch"]) and isinstance(d.get("clean"),bool) and isinstance(d.get("changed_files"),list) and isinstance(sha,str) and len(sha)==40
    @staticmethod
    def _verify_decision_engine(result: CapabilityResult) -> bool:
        d=result.data or {}; return result.ok and result.error is None and isinstance(d.get("context"),dict) and isinstance(d.get("recommended"),dict) and isinstance(d.get("alternatives"),list)
    @staticmethod
    def _verify_file_read(result: CapabilityResult) -> bool:
        d=result.data or {}; return result.ok and result.error is None and isinstance(d.get("path"),str) and isinstance(d.get("content"),str) and isinstance(d.get("char_count"),int)
    def _verify_file_write(self, result: CapabilityResult) -> bool:
        d=result.data or {}; sha=d.get("sha256"); return result.ok and result.error is None and isinstance(d.get("path"),str) and isinstance(d.get("bytes_written"),int) and isinstance(sha,str) and len(sha)==64
    def inspect_project(self, task: Task) -> CapabilityResult:
        if not self.project_root.is_dir(): return CapabilityResult(False,"project_inspection",{},"Project root does not exist.")
        files=directories=0
        for path in self.project_root.rglob("*"):
            if any(p in {".git",".pytest_cache","__pycache__"} for p in path.parts): continue
            if path.is_file(): files+=1
            elif path.is_dir(): directories+=1
        return CapabilityResult(True,"project_inspection",{"project_root":str(self.project_root),"files":files,"directories":directories})
    def run_tests(self, task: Task) -> CapabilityResult:
        completed=subprocess.run([sys.executable,"-m","pytest","-q"],cwd=self.project_root,capture_output=True,text=True,check=False,timeout=self.TEST_TIMEOUT_SECONDS)
        return CapabilityResult(completed.returncode==0,"test_runner",{"return_code":completed.returncode,"stdout":completed.stdout[-4000:],"stderr":completed.stderr[-4000:]},None if completed.returncode==0 else f"Test suite failed with exit code {completed.returncode}.")
