from typing import List, Dict


class GeotabClient:
    """MyGeotab integration service.

    TODO:
    - Authenticate against MyGeotab API
    - Fetch group tree
    - Resolve devices by group with name + serial
    """

    def list_groups(self) -> List[Dict[str, str]]:
        return [
            {"id": "GroupFleet", "name": "Entire Fleet"},
            {"id": "g1", "name": "Madrid"},
            {"id": "g2", "name": "Barcelona"},
        ]
