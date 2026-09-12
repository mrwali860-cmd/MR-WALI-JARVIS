"""
Empire OS
Task Engine — v0.1

Purpose:
Queue and manage Empire OS tasks.
"""
from __future__ import annotations
from typing import Any
from .tasks import Task, TaskStatus

class TaskEngine:
    """Manage the lifecycle of Empire OS tasks."""
    def __init__(self) -> None:
        self._tasks: dict[str, Task] = {}

    def add_task(self, task: Task) -> Task:
        if not isinstance(task, Task):
            raise TypeError("Task must be a Task instance.")
        if not isinstance(task.id, str) or not task.id.strip():
            raise ValueError("Task ID must be a non-empty string.")
        if task.id in self._tasks:
            raise ValueError(f"Task already exists: {task.id}")
        self._tasks[task.id] = task
        return task

    def get_task(self, task_id: str) -> Task | None:
        return self._tasks.get(task_id)

    def list_tasks(self, status: TaskStatus | None = None) -> list[Task]:
        tasks = list(self._tasks.values())
        if status is not None:
            tasks = [task for task in tasks if task.status == status]
        return tasks

    def next_pending(self) -> Task | None:
        for task in self._tasks.values():
            if task.status == TaskStatus.PENDING:
                return task
        return None

    def start_task(self, task_id: str) -> Task:
        task = self._require_task(task_id)
        if task.status != TaskStatus.PENDING:
            raise ValueError(f"Task cannot start from status: {task.status.value}")
        task.start()
        return task

    def complete_task(self, task_id: str, result: Any = None) -> Task:
        task = self._require_task(task_id)
        if task.status != TaskStatus.RUNNING:
            raise ValueError(f"Task cannot complete from status: {task.status.value}")
        task.complete(result)
        return task

    def fail_task(self, task_id: str, error: str) -> Task:
        task = self._require_task(task_id)
        if task.status != TaskStatus.RUNNING:
            raise ValueError(f"Task cannot fail from status: {task.status.value}")
        task.fail(error)
        return task

    def remove_task(self, task_id: str) -> Task:
        task = self._require_task(task_id)
        if task.status == TaskStatus.RUNNING:
            raise ValueError("Running tasks cannot be removed.")
        return self._tasks.pop(task_id)

    def summary(self) -> dict[str, int]:
        summary = {status.value: 0 for status in TaskStatus}
        for task in self._tasks.values():
            summary[task.status.value] += 1
        return summary

    def to_dict(self) -> list[dict[str, Any]]:
        return [task.to_dict() for task in self._tasks.values()]

    def _require_task(self, task_id: str) -> Task:
        task = self.get_task(task_id)
        if task is None:
            raise KeyError(f"Task not found: {task_id}")
        return task
