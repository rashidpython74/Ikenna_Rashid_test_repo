from sqlalchemy import Column, String, Integer, false
from database.database import Base, password

class UserData(Base):
    __tablename__ = "User_data"
    id = Column(Integer,autoincrement= True, primary_key= True, nullable= False)
    name = Column(String, nullable= False)
    age =  Column(Integer, nullable= False)
    password = Column(String, nullable= False)
    phone_number = Column(String, nullable= False)
    email= Column(String, nullable= False)
    address= Column(String, nullable= True)
    