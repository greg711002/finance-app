from slowapi import Limiter
from slowapi.util import get_remote_address

# Общий экземпляр rate-limiter. Подключается в app (app.state.limiter)
# и используется декоратором @limiter.limit(...) в эндпоинтах.
limiter = Limiter(key_func=get_remote_address)
