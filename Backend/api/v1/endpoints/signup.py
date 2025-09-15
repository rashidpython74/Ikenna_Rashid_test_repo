from fastapi import FastAPI, APIRouter, Depends
from sqlalchemy.orm import session
from model.user_data import *
from schema.auth_schema import *
from database.database import sessionLocal






app = APIRouter()
#Connection with DB------------->
def get_db():
    db = sessionLocal()
    try:
        yield db
    finally:
        db.close()

#Signup Route--------------------->
@app.post("/signup", response_model = signup_data)
def signup(user:signup_data, db:session = Depends(get_db)):
    new_user = UserData(name = user.name,
    password = user.password,
    age = user.age,
    email = user.email,
    phone_number = user.phone_number,
    address =  user.address
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

    
@app.get(
    "/remotely",
    summary="Redirect to Remotely login page",
    response_description="Redirects to the Remotely login page",
    response_model=None,
    responses={
        307: {"description": "Redirect to Remotely login page"},
        500: {"description": "Internal server error"}
    }
)
async def redirect_to_remotely():
    """
    Redirects users to the Remotely login page.
    
    This endpoint will redirect users to the Remotely web interface login page.
    """
    try:
        return RedirectResponse(url="http://192.168.10.60:5000/Account/Login", status_code=307)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))