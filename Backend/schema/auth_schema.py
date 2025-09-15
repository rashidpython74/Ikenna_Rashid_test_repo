from typing import Optional
from pydantic import BaseModel



class signup_data(BaseModel):
    name: str
    age: int
    phone_number: str
    password: str
    email: str
    address: Optional[str]