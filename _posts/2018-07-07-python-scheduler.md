---
layout: post
title:  "Python Scheduler 만들기(APScheduler)"
subtitle:   "Python Scheduler 만들기(APScheduler)"
categories: development
tags: python
comments: true
---

종종 스케쥴러를 만들어야할 때가 있습니다. 스케쥴러를 만드는 방법은 분산 작업큐를 담당하는 [Celery](http://www.celeryproject.org/), crontab, [Airflow](https://airflow.apache.org/), [APScheduler](http://apscheduler.readthedocs.io/en/latest/) 등 다양하게 존재합니다.

Airflow 내용은 [링크](https://zzsza.github.io/data/2018/01/04/airflow-1/)를 참고해주세요! 이번 글에선 APScheduler로 스케쥴러를 만들겠습니다. 이 라이브러리는 다른 라이브러리에 비해 간단히 구현이 가능합니다

---

## APScheduler
- Advanced Python Scheduler의 약자로 Daemon이나 Service가 아님
- 이미 존재하는 어플리케이션 내에서 실행
- 코드를 보면 쉽게 이해할 수 있음
- SQLAlchemy, MongoDB, Redis 등의 백엔드와 같이 사용할 수 있음 (default는 Memory)
- asyncio, gevent, Tornado, Twisted, Qt 등의 프레임워크와 같이 쓸 수 있음

## 실행 방식
- Cron : Cron 표현으로 실행
- Interval : 일정 주기로 실행
- Date : 특정 날짜로 실행(사실상 Cron과 동일)

## 스케쥴러 종류
- BlockingScheduler : 단일 스케쥴러
- BackgroundScheduler : 다중 스케쥴러
- AsyncIOScheduler
- GeventScheduler
- TornadoScheduler
- TwistedScheduler
- QtScheduler

## 설치
```
pip3 install apscheduler
```

## 코드
```
from apscheduler.jobstores.base import JobLookupError
from apscheduler.schedulers.background import BackgroundScheduler
import time


class Scheduler:
    def __init__(self):
        self.sched = BackgroundScheduler()
        self.sched.start()
        self.job_id = ''

    def __del__(self):
        self.shutdown()

    def shutdown(self):
        self.sched.shutdown()

    def kill_scheduler(self, job_id):
        try:
            self.sched.remove_job(job_id)
        except JobLookupError as err:
            print("fail to stop Scheduler: {err}".format(err=err))
            return

    def hello(self, type, job_id):
        print("%s Scheduler process_id[%s] : %d" % (type, job_id, time.localtime().tm_sec))

    def scheduler(self, type, job_id):
        print("{type} Scheduler Start".format(type=type))
        if type == 'interval':
            self.sched.add_job(self.hello, type, seconds=10, id=job_id, args=(type, job_id))
        elif type == 'cron':
            self.sched.add_job(self.hello, type, day_of_week='mon-fri',
                                                 hour='0-23', second='*/2',
                                                 id=job_id, args=(type, job_id))


if __name__ == '__main__':
    scheduler = Scheduler()
    scheduler.scheduler('cron', "1")
    scheduler.scheduler('interval', "2")

    count = 0
    while True:
        '''
        count 제한할 경우 아래와 같이 사용
        '''
        print("Running main process")
        time.sleep(1)
        count += 1
        if count == 10:
            scheduler.kill_scheduler("1")
            print("Kill cron Scheduler")
        elif count == 15:
            scheduler.kill_scheduler("2")
            print("Kill interval Scheduler")
```

## Reference
- [공식 Document](http://apscheduler.readthedocs.io/en/latest/)
