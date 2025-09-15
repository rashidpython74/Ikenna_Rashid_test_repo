from datetime import timedelta
from typing import List

from core.config import configs
from core.exceptions import AuthError
from core.security import create_access_token, get_password_hash, verify_password
from model.user import User
from repository.user_repository import UserRepository
from schema.auth_schema import Payload, SignIn, SignUp
from schema.user_schema import FindUser
from services.base_service import BaseService
from util.hash import get_rand_hash


class AuthService(BaseService):
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
        super().__init__(user_repository)

    def sign_in(self, sign_in_info: SignIn):
        find_user = FindUser()
        find_user.name = sign_in_info.name
        user: List[User] = self.user_repository.read_by_options(find_user)["founds"]
        # print(user)
        if len(user) < 1:
            raise AuthError(detail="Incorrect email or password")
        found_user = user[0]
        print(found_user)
        if not found_user.is_active:
            raise AuthError(detail="Account is not active")
        if not verify_password(sign_in_info.password, found_user.password):
            raise AuthError(detail="Incorrect email or password")
        delattr(found_user, "password")
        sign_in_result = {
            # "access_token": "",
            # "expiration": "",
            "user_info": found_user
        }
        return sign_in_result

    def sign_up(self, user_info: SignUp):
        user_token = get_rand_hash()
        user = User(**user_info.dict(exclude_none=True), is_active=True, is_superuser=False, user_token=user_token)
        user.password = get_password_hash(user_info.password)
        created_user = self.user_repository.create(user)
        delattr(created_user, "password")
        return created_user
    


    def check_user_authenticate(self, name:str, password:str):
        
        find_user = FindUser()
        find_user.name = name
        user: List[User] = self.user_repository.read_by_options(find_user)["founds"]
        if len(user) < 1:
            raise AuthError(detail="Incorrect username or password")
        found_user = user[0]
        if not found_user.is_active:
            raise AuthError(detail="Account is not active")
        if not verify_password(password, found_user.password):
            raise AuthError(detail="Incorrect username or password")
        delattr(found_user, "password")
        return found_user