"""
Empire Brain
============

Central Intelligence Controller.
"""

from .pipeline import BrainPipeline


class EmpireBrain:
    def __init__(self):
        self.pipeline = BrainPipeline()

    def think(self, user_input: str):
        return self.pipeline.process(user_input)
